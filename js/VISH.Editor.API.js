 /*
  * Wrapper to communicate with the ViSH Search API, and other ViSH services (eg: tags, thumbnails, ...)
  */

VISH.Editor.API = (function(V,$,undefined){
	
	var init = function(){
		queriesCounter = 0;
		queriesData = [];
		searchId = -1;
		sessionSearchs = {};
	};


	//////////////////////
	// ViSH Search API (https://github.com/ging/vish/wiki/Using-the-ViSH-Search-API)
	//////////////////////

	//Constants and internal vars
	var QUERY_TIMEOUT = 20000;
	var queriesCounter;
	var queriesData ;
	var searchId;
	var sessionSearchs;

	/*
	 * Search general method
	 */
	var _search = function(types, searchTerms, successCallback, failCallback){
		//1. Build Query
		var settings = {};
		settings.n = 20;
		settings.entities_type = types;
		// delete settings.sort_by //Sort by relevance
		// settings.language = ? //Filter by language
		settings.qualityThreshold = 0 //Filter by quality
		var query = _buildQuery(searchTerms,settings);

		//2. Peform the search in the instances
		var instances = V.ViSHInstances;
		var instancesL = instances.length;

		searchId =_getSearchId();
		sessionSearchs[searchId] = {};
		queriesCounter = 0;
		queriesData = [];
		
		for(var i=0; i<instancesL; i++){
			var instanceDomain = instances[i];
			sessionSearchs[searchId][instanceDomain] = {completed: false};

			_searchInViSHInstance(searchId,instanceDomain,query,function(data){
				if((typeof data.searchId == "undefined")||(data.searchId != searchId)){
					//Result of an old search
					return;
				}

				queriesCounter += 1;
				if((data.success===true)&&(typeof data.response != "undefined")&&(typeof data.response.results != "undefined")&&(typeof data.instanceDomain != "undefined")){
					queryResults = [];
					$(data.response.results).each(function(index,result){
						result.instance = data.instanceDomain;
						// result.avatar_url = (typeof result.avatar_url == "string" ? result.avatar_url : "lo.png");
						result.sorting_weight = (typeof result.weights != "undefined" && typeof result.weights.sorting_weight == "number") ? result.weights.sorting_weight : 0;
						queryResults.push(result);
					});
					queriesData = queriesData.concat(queryResults);
				}

				if(queriesCounter===instancesL){
					//All searches finished
					//Sort the results from different instances
					if(instancesL>1){
						queriesData = queriesData.sort(function(a,b){
							return b.sorting_weight-a.sorting_weight;
						});
					}
					if(typeof successCallback == "function"){
						successCallback(queriesData);
					}
				}
			});
		}
	};
	
	var _buildQuery = function(searchTerms,settings){
		searchTerms = (typeof searchTerms == "string" ? searchTerms : "");

		var query = "/apis/search?n="+settings.n+"&q="+searchTerms+"&type="+settings.entities_type;

		if(settings.sort_by){
			query += "&sort_by="+settings.sort_by;
		}

		if(settings.startDate){
			query += "&startDate="+settings.startDate;
		}

		if(settings.endDate){
			query += "&endDate="+settings.endDate;
		}

		if(settings.language){
			query += "&language="+settings.language;
		}

		if(settings.qualityThreshold){
			query += "&qualityThreshold="+settings.qualityThreshold;
		}

		return query;
	};

	var _searchInViSHInstance = function(searchId,domain,query,callback){
		var ViSHSearchAPIURL = domain + query;
		ViSHSearchAPIURL = ViSHSearchAPIURL.replace("//apis","/apis");

		$.ajax({
			type    : 'GET',
			url     : ViSHSearchAPIURL,
			success : function(data) {
				if(sessionSearchs[searchId][domain].completed == false){
					sessionSearchs[searchId][domain].completed = true;
					callback({success:true, searchId:searchId, instanceDomain:domain, response:data});
				}
			},
			error: function(error){
				if(sessionSearchs[searchId][domain].completed == false){
					sessionSearchs[searchId][domain].completed = true;
					callback({success:false, searchId:searchId, instanceDomain:domain});
				}
				V.Debugging.log("Error connecting with the ViSH API of " + domain);
			}
		});

		setTimeout(function(){
			if(sessionSearchs[searchId][domain].completed == false){
				sessionSearchs[searchId][domain].completed = true;
				callback({success:false, searchId:searchId});
			}
		},QUERY_TIMEOUT);
	};

	var _searchId = 0;
	var _getSearchId = function(){
		_searchId += 1;
		return _searchId;
	};

	/*
	 * Request resource methods (public methods of the V.Editor.API module)
	 */
	var requestImages = function(searchTerms, successCallback, failCallback){
		_search(["Picture"],searchTerms,successCallback,failCallback);
	};
	
	var requestVideos = function(searchTerms,successCallback,failCallback){
		_search(["Video"],searchTerms,successCallback,failCallback);
	};
	
	var requestObjects = function(searchTerms, successCallback, failCallback){
		_search(["Link","Scormfile","Webapp","Video","Audio","Swf"],searchTerms,successCallback,failCallback);
	};
	
	var requestPresentations = function(searchTerms, successCallback, failCallback){
		_search(["Excursion"],searchTerms,successCallback,failCallback);
	};



	//////////////////////
	// Handles APIs to another ViSH services
	//////////////////////

	/*
	 * Function to call ViSH and request tags
	 */
	var requestTags = function(successCallback, failCallback){
		if(typeof V.TagsPath != "string"){
			if(typeof failCallback == "function"){
				failCallback();
			}
			return;
		}

		$.ajax({
			type: "GET",
			url: V.TagsPath,
			dataType:"html",
			success:function(response){
				if(typeof successCallback == "function"){
					var tagsJSON = JSON.parse(response);
					var tags = [];
					if(tagsJSON.length>0){
						$.each(tagsJSON, function(index,tagJSON){
							tags.push(tagJSON.name);
						});
					};
					successCallback(tags);
				}
			},
			error:function (xhr, ajaxOptions, thrownError){
				if(typeof failCallback == "function"){
					failCallback();
				};
			}
		});
	};
	
	/*
	 * Function to get the available avatars
	 */
	var requestThumbnails = function(successCallback, failCallback){
		if(typeof V.ThumbnailsPath != "string"){
			if(typeof failCallback == "function"){
				failCallback();
			}
			return;
		}

		$.ajax({
			type: 'GET',
			url: V.ThumbnailsPath,
			dataType: 'json',
			success: function(data) {
				if(typeof successCallback == "function"){
					successCallback(data);
				}
			},
			error: function(xhr, ajaxOptions, thrownError){
				if(typeof failCallback == "function"){
					failCallback(xhr, ajaxOptions, thrownError);
				}
			}
		});
	};

	var uploadToXWiki = function (fileUrl, responseFormat, successCallback, failCallback) {
		var config = V.Configuration.getConfiguration();
		if (config.XWiki_url) {
			// Check that the xwiki url is correct
			var urlSplit = config.XWiki_url.split('/');
			if (urlSplit.length < 3) {
				failCallback && failCallback();
				return;
			}
			var xwikiDomain = urlSplit[0] + "//" + urlSplit[2];

			var timeout = window.setTimeout(function() {
				failCallback && failCallback();
			}, 60000);

			// XWiki sends 0 if there was an error, 1 if everything went well
			var receiveMessage = function (event) {
				if (event.origin !== xwikiDomain) { return; }

				window.clearTimeout(timeout);

				if (event.data == 0) {
					failCallback && failCallback();
					return;
				}
				successCallback && successCallback();
			}
			window.addEventListener("message", receiveMessage, false);

			// Post the blob to the XWiki iframe
			var handler = function (blobFile) {
				var iframe = document.getElementById("hiddenIframeForXWikiUploads");
				var iframeWin = iframe.contentWindow;
				var postMsg = function () {
					var id = V.exitPath.split('/').length > 1 ? parseInt(V.exitPath.split('/')[1]) : 0;
					var data = {
						blob: blobFile,
						format: responseFormat,
						id: id
					};
					iframeWin.postMessage(data, xwikiDomain);
				}
				if (iframe.src) {
					postMsg();
					return;
				} else {
					iframe.onload = postMsg;
					var xwikiURL = config.XWiki_url + "MOOC/Code/IframeVISH?xpage=plain&htmlHeaderAndFooter=true";
					iframe.src = xwikiURL;
				}
			}

			// Get the blob from the file url
			var xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function(){
				if (this.readyState == 4 && this.status == 200) {
					handler(this.response);
				}
			}
			xhr.open('GET', fileUrl);
			xhr.responseType = 'blob';
			xhr.send();

			return;
		}
	};


	var uploadTmpJSON = function(json, responseFormat, successCallback, failCallback){
		if(typeof V.UploadJSONPath != "string"){
			if(typeof failCallback == "function"){
				failCallback();
			}
			return;
		}

		responseFormat = (typeof responseFormat=="string") ? responseFormat : "json"

		var isXWikiUpload = responseFormat.slice(0, 5) === "xwiki";
		responseFormat = isXWikiUpload ? responseFormat.slice(6) : responseFormat;

		$.ajax({
			type: 'POST',
			url: V.UploadJSONPath,
			dataType: 'json',
			data: { 
				"authenticity_token" : V.User.getToken(),
				"json": JSON.stringify(json),
				"responseFormat": responseFormat
			},
			success: function(data){
				if((data)&&(data.url)){
					if(isXWikiUpload) {
						uploadToXWiki(data.url, responseFormat, successCallback, failCallback);
						return;
					}
					if (data.xml){
						var element = document.createElement('a');
						element.setAttribute('href', 'data:application/xml;charset=utf-8,' + encodeURIComponent(data.xml));
						element.setAttribute('download', data.filename);

						element.style.display = 'none';
						document.body.appendChild(element);

						element.click();
						document.body.removeChild(element);

					} else {
						_downloadFile(data.url);
					}

					if(typeof successCallback == "function"){
						successCallback();
					}
				} else if(typeof failCallback == "function"){
					failCallback();
				}
			},
			error: function(xhr, ajaxOptions, thrownError){
				if(typeof failCallback == "function"){
					failCallback(xhr, ajaxOptions, thrownError);
				}
			}
		});
	};

	var _downloadFile = function(fileURL){
		var iframe = $("#hiddenIframeForAjaxDownloads");
		$(iframe).attr("src",fileURL);
	};

	
	return {
		init						: init,
		requestPresentations        : requestPresentations,
		requestVideos               : requestVideos,
		requestImages               : requestImages,
		requestObjects              : requestObjects,
		requestTags                 : requestTags,
		requestThumbnails           : requestThumbnails,
		uploadTmpJSON               : uploadTmpJSON
	};

}) (VISH, jQuery);
