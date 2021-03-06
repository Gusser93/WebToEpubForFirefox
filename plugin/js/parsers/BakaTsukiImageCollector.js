/*
    Fetches the image files
*/

"use strict";

/*
    Details of an image in BakaTsuki web page
    imagePageUrl :  URL of web page that holds list of versions of the image
    sourceImageUrl : URL of thumbnail image jpeg/png/bmp file in source web page
    zipHref:  relative path + filename used to store file in the EPUB (zip) file.
    id: the id value in the content.opf file
    mediaType: jpeg, png, etc.
    arrayBuffer: the image bytes
    isCover :  use this as the cover image?
    height: "full size" image height 
    width: "full size" image width
    imagefileUrl: URL of "full size" image file at Baka-Tsuki
*/
function BakaTsukiImageInfo(imagePageUrl, imageIndex, sourceImageUrl) {
    // ToDo:  This will need to derive from EpubItem
    let that = this;
    this.imagePageUrl = imagePageUrl;
    this.sourceImageUrl = sourceImageUrl;
    let suffix = that.findImageType(imagePageUrl);
    this.zipHref = that.makeZipHref(imageIndex, suffix);
    this.id = that.makeId(imageIndex);
    this.mediaType = that.makeMediaType(suffix);
    this.imageIndex = imageIndex;
    this.isCover = false;
    this.isInSpine = false;
    this.arraybuffer = null;
    this.height = null;
    this.width = null;
    this.imagefileUrl = null
}

BakaTsukiImageInfo.prototype.findImageType = function (imagePageUrl) {
    // assume the image Page URL looks something like this:
    // http://www.baka-tsuki.org/project/index.php?title=File:WebToEpub.jpg
    let index = imagePageUrl.lastIndexOf(".");
    let suffix = imagePageUrl.substring(index + 1, imagePageUrl.length);
    return suffix;
}

BakaTsukiImageInfo.prototype.makeZipHref = function (imageIndex, suffix) {
    return "images/image_" + util.zeroPad(imageIndex) + "." +suffix;
}

BakaTsukiImageInfo.prototype.makeId = function (imageIndex) {
    return "image" + util.zeroPad(imageIndex);
}

BakaTsukiImageInfo.prototype.makeMediaType = function (suffix) {
    switch(suffix.toUpperCase()) {
        case "PNG":
            return "image/png";
        case "JPG":
        case "JPEG":
            return "image/jpeg";
        case "GIF":
            return "image/gif";
        default:
            alert("Unknown media type:" + suffix);
            return "image/" + suffix;
    };
}

BakaTsukiImageInfo.prototype.getZipHref = function () {
    return this.zipHref;
}

BakaTsukiImageInfo.prototype.getId = function () {
    return this.id;
}

BakaTsukiImageInfo.prototype.getMediaType = function () {
    return this.mediaType;
}

BakaTsukiImageInfo.prototype.fileContentForEpub = function() {
    return this.arraybuffer;
}

BakaTsukiImageInfo.prototype.createImageElement = function() {
    let that = this;
    return util.createSvgImageElement(that.getZipHref(), that.width, that.height);
}

function BakaTsukiImageCollector() {
}

// get URL of page that holds all copies of this image
BakaTsukiImageCollector.extractImagePageUrl = function (element) {
    return (element.tagName === "A") ? element.href : element.getElementsByTagName("a")[0].href;
}

// get src value of <img> element
BakaTsukiImageCollector.extractImageSrc = function (element) {
    return element.getElementsByTagName("img")[0].src;
}

function ImageElementConverter(element) {
    this.element = element;
}

ImageElementConverter.prototype.replaceWithImagePageUrl = function (images) {
    let that = this;
    // replace tag with nested <img> tag, with new <img> tag
    let imagePageUrl = BakaTsukiImageCollector.extractImagePageUrl(that.element);
    let imageInfo = images.get(imagePageUrl);
    if (imageInfo != null) {
        let newImage = imageInfo.createImageElement();
        that.element.parentElement.replaceChild(newImage, that.element);
    }
}

BakaTsukiImageCollector.makeImageConverter = function (element) {
    let that = this;

    // find "highest" element that is wrapping an image element
    let parent = element.parentElement;
    while (parent != null) {
        if (that.isImageWrapperElement(parent)) {
            return new ImageElementConverter(parent);
        }
        parent = parent.parentElement;
    }

    // assume all images are wrapped in at least a href
    return new ImageElementConverter(element.parentElement);
}

BakaTsukiImageCollector.isImageWrapperElement = function (element) {
    return ((element.tagName === "DIV") &&
        ((element.className === "thumb tright") || (element.className === "floatright") ||
        (element.className === "thumb")));
}

BakaTsukiImageCollector.prototype.findImagesUsedInDocument = function (content) {
    let that = this;
    let images = new Map();
    for(let currentNode of util.getElements(content, "img")) {
        let converter = BakaTsukiImageCollector.makeImageConverter(currentNode)
        if (converter != null) {
            let src = BakaTsukiImageCollector.extractImageSrc(converter.element);
            let pageUrl = BakaTsukiImageCollector.extractImagePageUrl(converter.element);
            let existing = images.get(pageUrl);
            let index = (existing == null) ? images.size : existing.imageIndex;
            let imageInfo = new BakaTsukiImageInfo(pageUrl, index, src);
            images.set(pageUrl, imageInfo);
        }
    };
    return images;
}

BakaTsukiImageCollector.prototype.populateImageTable = function (images, bakaTsukiParser) {
    let that = this;
    let imagesTable = document.getElementById("imagesTable");
    while (imagesTable.children.length > 1) {
        imagesTable.removeChild(imagesTable.children[imagesTable.children.length - 1])
    }
    let checkBoxIndex = 0;
    if (0 === images.size) {
        imagesTable.parentElement.appendChild(document.createTextNode("No images found"));
    }
    else {
        images.forEach(function (imageInfo) {
            let row = document.createElement("tr");
        
            // add checkbox
            let checkbox = that.createCheckBoxAndLabel(imageInfo, checkBoxIndex, bakaTsukiParser);
            that.appendColumnToRow(row, checkbox);

            // add image
            let img = document.createElement("img");
            img.setAttribute("style", "max-height: 120px; width: auto; ");
            img.src = imageInfo.sourceImageUrl;
            that.appendColumnToRow(row, img);
            imagesTable.appendChild(row);

            ++checkBoxIndex;
        });
    }

}

BakaTsukiImageCollector.prototype.createCheckBoxAndLabel = function (imageInfo, checkBoxIndex, bakaTsukiParser) {
    let that = this;
    let label = document.createElement("label");
    let checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "setCoverCheckBox" + checkBoxIndex;
    checkbox.onclick = function() { that.onImageClicked(checkbox.id, imageInfo, bakaTsukiParser); };
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode("Set Cover"));

    // default to first image as cover image
    if (checkBoxIndex === 0) {
        bakaTsukiParser.setCoverImage(imageInfo);
        checkbox.checked = true;
    }
    return label;
}

BakaTsukiImageCollector.prototype.onImageClicked = function(checkboxId, imageInfo, bakaTsukiParser) {
    let checkbox = document.getElementById(checkboxId);
    if (checkbox.checked === true) {
        bakaTsukiParser.setCoverImage(imageInfo);

        // uncheck any other checked boxes
        let imagesTable = document.getElementById("imagesTable");
        for(let box of util.getElements(imagesTable, "input")) {
            if (box.id !== checkboxId) {
                box.checked = false;
            }
        }
    }
} 

BakaTsukiImageCollector.prototype.appendColumnToRow = function (row, element) {
    let col = document.createElement("td");
    col.appendChild(element);
    col.style.whiteSpace = "nowrap";
    row.appendChild(col);
    return col;
}

BakaTsukiImageCollector.prototype.fetchImages = function (imageList, progressIndicator) {
    let that = this;
    let client = new HttpClient();
    var sequence = Promise.resolve();
    imageList.forEach(function(imageInfo) {
        sequence = sequence.then(function () {
            return client.fetchHtml(imageInfo.imagePageUrl);
        }).then(function (rawDom) {
            that.updateImageInfoFromImagePage(rawDom, imageInfo);
        }).then(function () {
            return client.fetchBinary(imageInfo.imagefileUrl);
        }).then(function (arraybuffer) {
            imageInfo.arraybuffer = arraybuffer;
            progressIndicator();
        })
    });
    return sequence;
}

BakaTsukiImageCollector.prototype.updateImageInfoFromImagePage = function(dom, imageInfo) {
    let div = util.getElement(dom, "div", e => (e.className === "fullImageLink"));
    let img = util.getElement(dom, "img");
    imageInfo.imagefileUrl = img.src;
    imageInfo.height = img.height;
    imageInfo.width = img.width;
    return imageInfo;
}

