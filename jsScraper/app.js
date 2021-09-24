const { 
    LinkedinScraper,
    relevanceFilter,
    timeFilter,
    typeFilter,
    experienceLevelFilter,
    events,
} = require("linkedin-jobs-scraper");

const dateFormat = require('dateformat');
const mongoCollections = require('./config/mongoCollections');
const jobs = mongoCollections.jobs;

(async () => {

    // Get MongoDB collection
    const jobsCol = await jobs();

    // Each scraper instance is associated with one browser.
    // Concurrent queries will run on different pages within the same browser instance.
    // https://www.npmjs.com/package/linkedin-jobs-scraper
    const scraper = new LinkedinScraper({
        headless: true,
        slowMo: 300,
        maxWorkers:1,
        args: [
            "--lang=en-GB",
        ],
    });

    // Add listeners for scraper events
    scraper.on(events.scraper.data, (data) => {
        let searchflag = '';
        const industries = ["food", "beverages"];

        try {
            industries.forEach(industry => {
                if (String(data.industries).toLowerCase().includes(industry)) {
                    searchflag = 'Relevant Industry';
                }
            });

            if (String(data.description).toLowerCase().includes("food science")) {
                searchflag = 'Food Science Description';
            }
        } catch (error) {
          console.log(error) 
        }
        
        if (searchflag) {
            data.scrapedate = dateFormat(new Date(), "yyyy-mm-dd h:MM:ss");
            data.searchflag = searchflag;
            jobsCol.updateOne(
                { id : data.jobId },
                { $set : data },
                { upsert : true }
            );
        }

        // console.log(
        //     data.description.length,
        //     data.descriptionHTML.length,
        //     `Query='${data.query}'`,
        //     `Location='${data.location}'`,
        //     `Id='${data.jobId}'`,
        //     `Title='${data.title}'`,
        //     `Company='${data.company ? data.company : "N/A"}'`,
        //     `Place='${data.place}'`,
        //     `Date='${data.date}'`,
        //     `Link='${data.link}'`,
        //     `applyLink='${data.applyLink ? data.applyLink : "N/A"}'`,
        //     `senorityLevel='${data.senorityLevel}'`,
        //     `function='${data.jobFunction}'`,
        //     `employmentType='${data.employmentType}'`,
        //     `industries='${data.industries}'`,
        //     `description='${data.description}'`,
        // );
    });

    scraper.on(events.scraper.error, (err) => {
        console.error(err);
    });

    scraper.on(events.scraper.end, () => {
        console.log('All done!');
    });

    // Add listeners for puppeteer browser events
    scraper.on(events.puppeteer.browser.targetcreated, () => {
    });
    scraper.on(events.puppeteer.browser.targetchanged, () => {
    });
    scraper.on(events.puppeteer.browser.targetdestroyed, () => {
    });
    scraper.on(events.puppeteer.browser.disconnected, () => {
    });

    // Custom function executed on browser side to extract job description
    const descriptionFn = () => document.querySelector(".description__text")
        .innerText
        .replace(/[\s\n\r]+/g, " ")
        .trim();

    // Run queries concurrently   
    let jobOptions = {
        filters: {
            relevance : relevanceFilter.RELEVANT,
            time: timeFilter.MONTH,
            type: [typeFilter.FULL_TIME],
            experience: [experienceLevelFilter.ENTRY_LEVEL]    
        },       
    }
    
    let queries = [
        {
            query: "Account Manager",
            options: jobOptions                                                    
        },
        {
            query: "Product Manager",
            options: jobOptions
        },
        {
            query: "Brand Manager",
            options: jobOptions
        },
        {
            query: "Sales",
            options: jobOptions
        },
    ];

    // Global options for this run, 
    // will be merged individually with 
    // each query options (if any)
    await Promise.all([
        // Run queries serially
        scraper.run(
            queries, 
            { 
                locations: ["New York City"],
                optimize: true,
                limit: 1000000,
            } 
        ),
    ]);

    // Close browser
    await scraper.close();
})();
