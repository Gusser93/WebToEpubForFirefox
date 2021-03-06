/*
  Parses files on archiveofourown.net
*/
"use strict";

function ArchiveOfOurOwnParser() {
}

// Make ArchiveOfOurOwnParser inherit from Parser
ArchiveOfOurOwnParser.prototype = Object.create(Parser.prototype);
ArchiveOfOurOwnParser.prototype.constructor = ArchiveOfOurOwnParser;

parserFactory.register("archiveofourown.org", function() { return new ArchiveOfOurOwnParser() });

ArchiveOfOurOwnParser.prototype.getChapterUrls = function (dom) {
    let that = this;
    return new Promise(function(resolve, reject) {
        let baseUrl = that.getBaseUrl(dom);
        let chaptersElement = that.getElement(dom, "li", e => (e.className === "chapter") );
        if (chaptersElement === null) {
            resolve(that.singleChapterStory(baseUrl, dom));
        } else {
            resolve(that.getElements(chaptersElement, "option").map(option => that.optionToChapterInfo(baseUrl, option)));
        }
    });
};

ArchiveOfOurOwnParser.prototype.optionToChapterInfo = function (baseUrl, optionElement) {
    let relativeUrl = optionElement.getAttribute("value");
    return {
        sourceUrl: util.resolveRelativeUrl(baseUrl, relativeUrl) + '?view_adult=true',
        title: optionElement.innerText
    };
};

// find the node(s) holding the story content
ArchiveOfOurOwnParser.prototype.findContent = function (dom) {
    return this.getElement(dom, "div", 
		e => (e.className === "userstuff module") || e.className.startsWith("storytext")
	);
};

ArchiveOfOurOwnParser.prototype.extractTitle = function(dom) {
    return this.getElement(dom, "h2", e => (e.className === "title heading") ).innerText.trim();
};

ArchiveOfOurOwnParser.prototype.extractAuthor = function(dom) {
    return this.getElement(dom, "h3", e => (e.className === "byline heading") ).innerText.trim();
};

ArchiveOfOurOwnParser.prototype.extractLanguage = function(dom) {
    return this.getElement(dom, "meta", e => (e.getAttribute("name") === "language") ).getAttribute("content");
};

