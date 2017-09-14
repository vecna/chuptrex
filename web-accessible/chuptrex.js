
window.addEventListener('popstate', function(event) {
    console.log("popstate, loading page from location");
    loadPage();
}, false);

var chuptrexC = null;

function initializeChuptrex(initD) {
    chuptrexC = initD;
};

function loadPage(destpage) {

    var guessed = false;
    if(!destpage) {
        console.log("destpage undeclared, guessing from location");
        guessed = true;
        destpage = window.location.pathname;
    }

    var validP = [ '/site', '/landing', '/what-to-do', '/about' ];

    console.log("destpage " + destpage);

    if(_.endsWith(destpage, '/site')) {
        var a = destpage.split('/');
        a.pop();
        var siten = a.pop();
        destpage = '/site';
        console.log("Extracted site from location: [" + siten + "]");
    }

    if(validP.indexOf(destpage) == -1) {
        console.log("Unknown location: "+ destpage +", forcing to 'landing'");
        destpage = '/landing';
    }

    $('li').removeClass('active');

    /* nothig is active when a site is look-at */
    if(destpage === '/site')
        $('.' + _.trim(destpage, '/') ).addClass('active');

    console.log("Loading page request: " + destpage + " to /direct ");
    $("#content").load("/direct" + destpage, function () {

        /* if a script need to be executed at the load, here it is fired,
         * this is a sloppy code: in fact I'm waiting 300ms hoping the <div>
         * has been put in the DOM */
        setTimeout(function() {

            if(destpage === '/landing') {
                _.each(chuptrexC, function(name, cc) {
                    trexCookiesRank('clinics-'+cc, '#'+name+'cookiesrank');
                    trexCompanyRank('clinics-'+cc, '#'+name+'companyrank');
                });
            }

            if(destpage === '/archive') {
                /* not used ATM */
                console.log("loadPage/archive " + defaultCampaign);
                if( $("#archivetable").length )
                    trexArchive(defaultCampaign, '#archivetable');
                if( $("#detailedlist").length )
                    trexDetails(defaultCampaign, '#detailedlist');
            }

            if(_.endsWith(destpage,'/site')) {
                console.log("loadPage/site " + siten);
                /* piegraph is expected to exist, and .sitename is a class,
                 * like #firstpartyn -- clean this pattern */
                if( $('#sitedetails').length )
                    trexSiteDetails(siten);
            }

        }, 300);

        console.log("Loading and recording " + destpage);
        if(_.endsWith(destpage, 'site'))
            destpage = siten + destpage;

        if(!guessed)
            history.pushState(
                {'nothing': false},
                initiativePrefix,
                destpage
            );
    });
};

function getSpan(text, id, style) {
    return '<span class="'+style+'" id="'+id+'">'+text+'</span>';
};


function trexSiteDetails(sitename) {

    d3.json("/api/v1/evidences/" + sitename, function(collections) {

        var pied = _.countBy(
            _.reject(collections, {domaindottld: sitename}),
            'domaindottld');

        var first = _.filter(collections, {domaindottld: sitename});

        $("#firstpartyn").text(_.size(first));
        $("." + "sitename").text(sitename);

        c3.generate({
            bindto: '#domainpiegraph',
            data: {
                json: pied,
                type: 'donut',
            },
            donut: { title: sitename }
        });

        var piecompany = _.countBy(
            _.filter(collections, function(o) {
                return !_.isUndefined(o.company);
            }), 'company');

        c3.generate({
            bindto: '#companypiegraph',
            data: {
                json: piecompany,
                type: 'donut',
            },
        });

        var ext = _.reject(collections, {domaindottld: sitename});

        $('#sitedetails').html('<ol id="orderedL">');
        _.each(ext, function(o) {
            var info = '';

            if(o['Content-Type']) {
                info = o['Content-Type'].replace(/;.*/, '');
            }

            if(o['cookies']) {

                if(info !== '')
                    info += ", ";

                if(_.size(o['cookies']) === 1)
                    info += "un Cookie installato";
                else
                  info += _.size(o['cookies']) + " Cookie installati";
            }

            if(info !== '')
                info = '<ul><li>' + info + '</ul></li>';

            $('#orderedL').append('<li>' + 
                '<span class="noverflow">' + o.url + '</span>' +
                info +
                '</li>');
        });

    });
}

function trexCookiesRank(campaignName, destId) {

    d3.json("/api/v1/surface/" + campaignName, function(collections) {

        console.log("trexCookiesRank: campaign " + campaignName + 
                " dest " + destId + " surface #" + _.size(collections) );

        var cookiesInfo = _.reduce(collections, function(memo, site) {

            if(!_.size(site.cookies))
                return memo;

            memo.push({
                site: site.domaindottld,
                cookies: _.size(site.cookies),
                info: site.cookies
            });
            return memo;
        }, []);

        cookiesInfo = _.reverse(_.orderBy(cookiesInfo, 'cookies'));

        return c3.generate({
            bindto: destId,
            data: {
                json: cookiesInfo,
                keys: {
                    x: 'site',
                    value: [ 'cookies' ]
                },
                type: 'bar',
                colors: { 'cookies': '#339199' },
                onclick: function(d, element) {
                    if(!$(element).hasClass('_selected_')) {
                        var ddtld = this.categories()[d.x];
                        loadPage(ddtld + '/site');
                    }
                },
                selection: { enabled: true },

            },
            size: { height: 800 },
            legend: { show: false },
            axis: {
                x: {
                    type: 'categories',
                },
                rotated: true
            }
        });
    });
};


function trexCompanyRank(campaignName, destId) {

    d3.json("/api/v1/surface/" + campaignName, function(collections) {

        console.log("trexCompanyRank: campaign " + campaignName + 
                " dest " + destId + " surface #" + _.size(collections) );

        var leaders = _.reduce(collections, function(memo, site) {
            _.each(site.leaders, function(l) {
                if(l.p < 10)
                    return memo;

                var x = _.find(memo, {company: l.company });

                if(!x)
                    memo.push(l);
            });
            return memo;
        }, []);

        leaders = _.reverse(_.orderBy(leaders, 'p'));

        return c3.generate({
            bindto: destId,
            data: {
                json: leaders,
                keys: {
                    x: 'company',
                    value: [ 'p' ]
                },
                colors: { 'p': '#C44F9D' },
                type: 'bar',
                names: {
                    p: 'frequenza in percentuale %'
                }
            },
            size: { height: 800 },
            legend: { show: false },
            axis: {
                x: {
                    type: 'categories'
                },
                rotated: true
            },
            grid: {
                y: {
                    lines: [
                        { value: 50, text: '50%', position: 'middle' }
                    ]
                }
            }
        });
    });
};

