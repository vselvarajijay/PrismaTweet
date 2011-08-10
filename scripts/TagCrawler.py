import httplib
import json
import logging
import socket
import time
import urllib
import pymongo
import json

SEARCH_HOST="search.twitter.com"
SEARCH_PATH="/search.json"


class TagCrawler(object):
    ''' Crawl twitter search API for matches to specified tag.  Use since_id to
    hopefully not submit the same message twice.  However, bug reports indicate
    since_id is not always reliable, and so we probably want to de-dup ourselves
    at some level '''
  

    tags = ["pink","red","orange","yellow","green","blue","purple"]


    def __init__(self, max_id, interval):
        self.max_id = max_id
        self.interval = interval
	self.resetColorMaxIDs()	
	self.initializeDB()	

    def initializeDB(self):
	mongo = pymongo.Connection('localhost')
	self.prisma_db = mongo['prisma_db']
	self.color_histogram = self.prisma_db['color_histograms']

    def resetHistogram(self):
	self.colorHistogram = {}

	for tag in self.tags:
		self.colorHistogram[tag] = 0

    def resetColorMaxIDs(self):
	self.colorMaxIDs = {}
	
	for tag in self.tags:
		self.colorMaxIDs[tag] = 0  

 
    def search(self, tag):
        c = httplib.HTTPConnection(SEARCH_HOST)
        params = {'q' : tag}
        if self.max_id is not None:
            params['since_id'] = self.max_id
        path = "%s?%s" %(SEARCH_PATH, urllib.urlencode(params))
        try:
            c.request('GET', path)
            r = c.getresponse()
            data = r.read()
            c.close()
            try:
                result = json.loads(data)
            except ValueError:
                return None
            if 'results' not in result:
                return None
            self.max_id = result['max_id']
	    self.colorMaxIDs[tag] = result['max_id']
            return result['results']
        except (httplib.HTTPException, socket.error, socket.timeout), e:
            logging.error("search() error: %s" %(e))
            return None

    def countTag(self,dataResults, tag):
	count = self.colorHistogram[tag]
	for result in dataResults:
		result = result['text'].lower()
		tag = tag.lower()
		count +=result.count(tag)
	return count

    def printHistogram(self):
	line = []
	for tag in self.tags:
		for i in range(self.colorHistogram[tag]):
			line.append(tag[0])

	print " ".join(line)

    def tagLoop(self):

	while True:
		self.resetHistogram()

		for tag in self.tags:
			#print "starting search for "+tag
			data = self.search(tag)
			if data:
			#	print str(len(data))+" new result(s) found for " + tag
				self.colorHistogram[tag] = self.countTag(data,tag)
#				self.submit(data)
#			else:
#				print "no new results found for "+tag
#		print "search completed sleeping for " + str(self.interval) + " seconds."


		total = 0
		for tag in self.tags:
			total += self.colorHistogram[tag]

#		print "total: " + str(total)
		
		if total!=0:
			for tag in self.tags:
				self.colorHistogram[tag] = int((float(self.colorHistogram[tag])/float(total))*100)
	#		self.printHistogram()
			jsonStr = json.dumps(self.colorHistogram)
			self.color_histogram.insert({"color_histogram":jsonStr})
		
		time.sleep(float(self.interval))

    def loop(self):
        while True:
            logging.info("Starting search")
            print "Starting search"
            data = self.search()
            if data:
                print str(len(data))+" new result(s) found"
                logging.info("%d new result(s)" %(len(data)))
                self.submit(data)
            else:
                logging.info("No new results")
                print "No new results"
            logging.info("Search complete sleeping for %d seconds"
                    %(self.interval))
            print "Search completed sleeping for "+str(self.interval)+" seconds."
            time.sleep(float(self.interval))

    def submit(self, data):
        print data


if __name__ == "__main__":
	crawler = TagCrawler(0,10);
	crawler.tagLoop();

