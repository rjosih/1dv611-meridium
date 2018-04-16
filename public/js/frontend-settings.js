function standard() {
    document.getElementById('url').disabled = false;
    document.getElementById('includeDomains').disabled = false;
    document.getElementById('excludePaths').disabled = false;
    // document.getElementsByClassName('normal').disabled = false
    // document.querySelectorAll('#url, #includeDomains, #excludePaths').disabled = false
    document.getElementById('s0').disabled = false;
    document.getElementById('s1').disabled = false;
    document.getElementById('s2').disabled = false;
    document.getElementById('s3').disabled = false;
    document.getElementById('s4').disabled = false;
    document.getElementById('s5').disabled = false;
    document.getElementById('metaTags0').disabled = false;
    document.getElementById('metaTags1').disabled = false;
    document.getElementById('metaTags2').disabled = false;
    document.getElementById('structure').disabled = false;

    document.getElementById('rawDataInput').disabled = true;

    document.getElementById('settings').checked = true;
    document.getElementById('advancedSettings').checked = false;

}

function advanced() {
    document.getElementById('url').disabled = true;
    document.getElementById('includeDomains').disabled = true;
    document.getElementById('excludePaths').disabled = true;
    document.getElementById('s0').disabled = true;
    document.getElementById('s1').disabled = true;
    document.getElementById('s2').disabled = true;
    document.getElementById('s3').disabled = true;
    document.getElementById('s4').disabled = true;
    document.getElementById('s5').disabled = true;
    document.getElementById('metaTags0').disabled = true;
    document.getElementById('metaTags1').disabled = true;
    document.getElementById('metaTags2').disabled = true;
    document.getElementById('structure').disabled = true;

    document.getElementById('rawDataInput').disabled = false;

    document.getElementById('settings').checked = false;
    document.getElementById('advancedSettings').checked = true;
}

standard();