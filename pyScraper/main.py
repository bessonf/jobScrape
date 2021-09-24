# import logging
from linkedin_jobs_scraper import LinkedinScraper
from linkedin_jobs_scraper.events import Events, EventData
from linkedin_jobs_scraper.query import Query, QueryOptions, QueryFilters
from linkedin_jobs_scraper.filters import RelevanceFilters, TimeFilters, TypeFilters, ExperienceLevelFilters
import pymongo
import datetime
import os
import re

client = pymongo.MongoClient(os.environ['mongoUrl'])

db = client.test.jobs

#https://github.com/kirkhunter/linkedin-jobs-scraper

def on_data(data: EventData):

    flag = ''
    # START - Edit this section for filtering jobs based on criteria
    # try:
    #     for industry in ['Food', 'Beverages']:
    #         if industry.lower() in data.industries.lower():
    #             flag = 'Relevant Industry'
    #     if 'food science' in data.description.lower():
    #         flag = 'Food Science Degree'
    # except Exception as e:
    #     print(e)
    # END - done with filtering
        

    if not flag:
        return

    job = {}

    try:
        job['id'] = data.job_id
    except:
        return

    try:
        job['title'] = data.title
    except:
        pass

    try:
        job['company'] = data.company
    except:
        pass

    try:
        job['location'] = data.place
    except:
        pass

    try:
        job['description'] = re.sub('<[^<]+?>', ' ', data.description)
    except:
        pass

    try:
        job['flag'] = flag
    except:
        pass

    try:
        job['date_posted'] = data.posted
    except:
        pass

    try:
        job['date_stored'] = datetime.datetime.strftime(datetime.datetime.now(),'%Y-%m-%d')
    except:
        pass

    try:
        job['experience'] = data.seniority_level
    except:
        pass

    try:
        job['employment_type'] = data.employment_type
    except:
        pass

    try:
        job['function'] = data.job_function
    except:
        pass

    try:
        job['industry'] = data.industries
    except:
        pass

    try:
        job['date_posted'] = data.date
    except:
        pass

    try:
        job['query'] = data.query
    except:
        pass

    try:
        job['link'] = data.link
    except:
        return

    try:
        job['apply_link'] = data.apply_link
    except:
        pass

    try:
        filter = { 'id': job['id'] }
        db.update_one(filter,{ "$set": job },upsert=True)
    except Exception as e:
        print(e)
        

def on_error(error):
    print('[ON_ERROR]', error)


def on_end():
    print('[ON_END]')


scraper = LinkedinScraper(
    chrome_executable_path='chromedriver', # Custom Chrome executable path (e.g. /foo/bar/bin/chromedriver) 
    chrome_options=None,  # Custom Chrome options here
    headless=True,  # Overrides headless mode only if chrome_options is None
    max_workers=1,  # How many threads will be spawned to run queries concurrently (one Chrome driver for each thread)
    slow_mo=2
)

# Add event listeners
scraper.on(Events.DATA, on_data)
scraper.on(Events.ERROR, on_error)
scraper.on(Events.END, on_end)

queries = []
types = ['Account','Product','Brand']
for t in types:
    queries.append(
        Query(
            query=f'{t} Manager',
            options=QueryOptions(
                locations=['New York City'],
                optimize=True,
                limit=1000000000,
                filters=QueryFilters(
                    relevance=RelevanceFilters.RECENT,
                    time=TimeFilters.MONTH,
                    type=[TypeFilters.FULL_TIME],
                    experience=[ExperienceLevelFilters.ENTRY_LEVEL],
                )
            )
        )
    )

if __name__ == "__main__":
    while True:
        scraper.run(queries)