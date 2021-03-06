const { exec } = require('child_process');
const { URL } = require('url');
const Archive = require('../models/archive');
const dayjs = require('dayjs');
const fs = require('fs-extra');
const prettyFileSize = require('prettysize');
const getUrls = require('get-urls');
const path = require('path');
const EmailModel = require('../models/emailModel');
const zipFolder = require('../utils/zipFolder');
const Setting = require('../models/enums').setting;

/**
 *
 * @param {string} settings The settings to archive.
 */
exports.archive = async (settings) => {
    let PREVIEWS_FOLDER = path.join(__dirname + `/../../${process.env.PREVIEWS_FOLDER}`);
    let ARCHIVES_FOLDER = path.join(__dirname + `/../../${process.env.ARCHIVES_FOLDER}`);
    let ARCHIVE_ID = '';

    try {
        let command = createCommand(settings);

        let urls = [...getUrls(command)];
        let hostnames = urls.map(url => new URL(url).hostname);

        let timestamp = getTimestamp(); // ex 2018-03-29_22-29-21-424
        ARCHIVE_ID = `${hostnames[0]}_${timestamp}`;

        command = `${command} -O "${ARCHIVES_FOLDER}/${ARCHIVE_ID}"`;

        let archivedFolder = `${ARCHIVES_FOLDER}/${ARCHIVE_ID}`;

        let httrack = process.env.IS_RUNNING_LINUX_OS === 'true' ? 'httrack' : `"${process.cwd()}/httrack/httrack.exe"`;
        let previewCommand = `${httrack} ${urls[0]} -* +*.html +*.css +*.js "+*.jpg*[<150]" "+*.png*[<150]" -O "${PREVIEWS_FOLDER}/${ARCHIVE_ID}_original"`;

        // Preview
        await runCommand(previewCommand);

        // Archive
        await runCommand(command);
        await Promise.all(hostnames.map(async hostname => {
            await moveFolder(`${archivedFolder}/${hostname}`, `${archivedFolder}/folderToZip/${hostname}`);
            await moveFolder(`${archivedFolder}/www.${hostname}`, `${archivedFolder}/folderToZip/${hostname}`);
        }));
        await moveFolder(`${archivedFolder}/web`, `${archivedFolder}/folderToZip/`);

        let fileSize = await zip(`${archivedFolder}/folderToZip`, `${archivedFolder}.zip`);
        await removeFolder(`${archivedFolder}`);

        // Create archive in database
        let archive = new Archive({
            fileName: `${ARCHIVE_ID}.zip`,
            ownerId: settings.ownerId,
            fileSize: fileSize,
            fromSchedule: settings.fromSchedule
        });
        await archive.save();

        // Preview folder gets the archive id name to make the viewing of previews to work.
        await moveFolder(`${PREVIEWS_FOLDER}/${ARCHIVE_ID}_original/${hostnames[0]}`, `${PREVIEWS_FOLDER}/${archive.id}`);
        await removeFolder(`${PREVIEWS_FOLDER}/${ARCHIVE_ID}_original`);

        // Send success email
        let downloadUrl = `${process.env.SERVER_DOMAIN}/${process.env.ARCHIVES_FOLDER}/${archive.id}`;
        let scheduleUrl = `${process.env.SERVER_DOMAIN}/${process.env.ARCHIVES_FOLDER}/edit/${archive.fromSchedule}`;
        sendSuccessEmail({
            email: settings.email,
            fileSize: fileSize,
            url: urls[0],
            downloadUrl: downloadUrl,
            scheduleUrl: scheduleUrl
        });
    } catch (err) {
        console.log(err);

        // Send error mail
        sendErrorEmail({
            email: settings.email,
            url: settings.url
        });
    }
};

function getTimestamp() {
    let date = dayjs().toObject();
    // Months + 1 because it starts at 0. E.g. May = 4
    return `${date.years}-${date.months + 1}-${date.date}_${date.hours}-${date.minutes}-${date.seconds}-${date.milliseconds}`; // 2018-03-29_22-29-21-424
}

/**
 * @param {string} folder Folder to zip
 * @param {string} zipDest File destination
 * @returns {promise} Filesize in bytes
 */
function zip(folder, zipDest) {
    return new Promise((resolve, reject) => {
        zipFolder(folder, zipDest, (error, fileSize) => {
            if (error) {
                console.log(error);
                reject();
            }
            resolve(fileSize);
        });
    });
}

async function moveFolder(orig, dest) {
    try {
        await fs.move(orig, dest);
    } catch (err) {
        // TODO : Log faults
        // if (err.code === 'ENOENT') {
        // No such file or directory, just continue...
        // }
    }
}

async function removeFolder(folder) {
    await fs.remove(folder);
}

function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) reject(error);
            resolve();
        });
    });
}

function createCommand(s) {
    let httrack = process.env.IS_RUNNING_LINUX_OS === 'true' ? 'httrack' : `"${process.cwd()}/httrack/httrack.exe"`;
    let exclude = s.excludePaths && s.excludePaths[0] !== '' ? s.excludePaths.map(path => `-*${path}/*`) : '';

    if (s.typeOfSetting === Setting.STANDARD) {
        let command = [
            httrack,
            s.url, // Url to crawl.
            ...s.includeDomains, // Domains to include.
            ...exclude, // Paths to exclude.
            `-s${s.robots}`, // 0 = ignore all metadata and robots.txt. 1 = check all file types without directories. 2 = check all file types including directories.
            `-N${s.structure}`, // Site structure. 0 = default site structure.
            `-A${100000000000}`, // Maximum transfer rate in bytes/seconds.
            `-%c${10}`, // Maximum number of connections/seconds.
            // '-%!',                       // Crawl without limit. DO NOT USE.
            `-C${0}`, // Cache. 0 = no cache. 1 = cache. 2 = see what works best.
            // '-%F', '<!-- Arkivdium -->',    // Footer content.
            `-f${2}`, // 2 = put all logs in a single log file.
            '-q' // Quiet mode. No questions. No log.
        ];

        return command.join(' ');
    } else if (s.typeOfSetting === Setting.ADVANCED) {
        return `${httrack} ${s.advancedSetting}`;
    }
}

function sendSuccessEmail(settings) {
    let emailSettings = {
        to: settings.email,
        subject: 'Arkiveringen är klar ✔',
        message: `<p>Hej,</p>
                  <p>Din arkivering av <b><a href="${settings.url}">${settings.url}</a></b> är klar.</p>
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                          <td style="padding-bottom:10px;">
                              <table border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                      <td align="center" style="border-radius: 3px;" bgcolor="#00d1b2">
                                          <a href="${settings.downloadUrl}" style="font-size: 14px; font-family: Helvetica, Arial, sans-serif; color: #ffffff;
                                             text-decoration: none; text-decoration: none;border-radius: 3px; padding: 8px; border: 1px solid #00d1b2;display: inline-block;">
                                             Ladda ned arkiv (${prettyFileSize(settings.fileSize)})</a>
                                      </td>
                                  </tr>
                              </table>
                          </td>
                      </tr>
                      <tr>
                          <td>
                            <table border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="border-radius: 3px;" bgcolor="#209cee">
                                        <a href="${settings.scheduleUrl}" target="_blank" style="font-size: 14px; font-family: Helvetica, Arial, sans-serif; color: #ffffff;
                                            text-decoration: none; text-decoration: none;border-radius: 3px; padding: 8px; border: 1px solid #209cee;display: inline-block;">
                                            Redigera inställning</a>
                                    </td>
                                </tr>
                            </table>  
                          </td>
                      </tr>
                  </table>
                  <p>Med vänliga hälsningar,<br>Arkivdium</p><br>`
    };
    EmailModel.sendMail(emailSettings);
}

function sendErrorEmail(settings) {
    let emailSettings = {
        to: settings.email,
        subject: 'Din schemalagda arkivering kunde inte slutföras!',
        message: `<p><b>Din schemalagda arkivering av 
        <a href="${settings.url}">${settings.url}</a> kunde inte slutföras.</b></p>`

    };
    EmailModel.sendMail(emailSettings);
}
