VISH.Editor.Image = (function(V,$,undefined){
	
	var init = function(){
		VISH.Editor.Image.Flikr.init();
		VISH.Editor.Image.Repository.init();
	};
	
	
	var onLoadTab = function(){
		
		var options = VISH.Editor.getOptions();
	
		var bar = $('.upload_progress_bar');
    var percent = $('.upload_progress_bar_percent');
		
		//Reset fields
    bar.width('0%');
    percent.html('0%');
		$("#tab_pic_upload_content .previewimgbox button").hide()
		$("#tab_pic_upload_content .previewimgbox img.uploadPreviewImage").remove();
		if (previewBackground) {
		  $("#tab_pic_upload_content .previewimgbox").css("background-image", previewBackground);
	  }
		$("input[name='document[file]']").val("");
		$("#tab_pic_upload_content .documentblank").removeClass("documentblank_extraMargin")
		$("#tab_pic_upload_content .buttonaddfancy").removeClass("buttonaddfancy_extraMargin")
		
	  $("input[name='document[file]']").change(function () {
      $("input[name='document[title]']").val($("input:file").val());
    });
			
		$("#tab_pic_upload_content #upload_document_submit").click(function(event) {
			if($("input[name='document[file]']").val()==""){
        event.preventDefault();
			}else{
				if (options) {
	        var description = "Uploaded by " + options["ownerName"] + " via Vish Editor"
	        $("input[name='document[description]']").val(description);
	        $("input[name='document[owner_id]']").val(options["ownerId"]);
	        $("input[name='authenticity_token']").val(options["token"]);
	        $(".documentsForm").attr("action", options["documentsPath"]);
        }
			}
    });
	
	  $('form').ajaxForm({
      beforeSend: function() {
          var percentVal = '0%';
          bar.width(percentVal);
          percent.html(percentVal);
      },
      uploadProgress: function(event, position, total, percentComplete) {
          var percentVal = percentComplete + '%';
          bar.width(percentVal)
          percent.html(percentVal);
      },
      complete: function(xhr) {
          console.log(xhr.responseText);
					processResponse(xhr.responseText);
          var percentVal = '100%';
          bar.width(percentVal)
          percent.html(percentVal);
      }
    });
	};
	
	
	var drawUploadedElement = function(){
		drawImage( $("#tab_pic_upload_content .previewimgbox img.uploadPreviewImage").attr("src"));
		$.fancybox.close();
	}
	
	
	var previewBackground;
	
	var processResponse = function(response){
		try  {
	    var jsonResponse = JSON.parse(response)
	    if(jsonResponse.src){
	       previewBackground = $("#tab_pic_upload_content .previewimgbox").css("background-image");
	       $("#tab_pic_upload_content .previewimgbox").css("background-image","none");
	       $("#tab_pic_upload_content .previewimgbox img.uploadPreviewImage").remove();
	       $("#tab_pic_upload_content .previewimgbox").append("<img class='uploadPreviewImage' src='" + jsonResponse.src + "'></img>");
				 $("#tab_pic_upload_content .previewimgbox button").show();
         $("#tab_pic_upload_content .documentblank").addClass("documentblank_extraMargin")
         $("#tab_pic_upload_content .buttonaddfancy").addClass("buttonaddfancy_extraMargin")
	    }
    } catch(e) {
      //No JSON response
    }
	}
	
  /**
   * Function to draw an image in a zone of the template
   * the zone to draw is the one in current_area (params['current_el'])
   * this function also adds the slider and makes the image draggable
   * param area: optional param indicating the area to add the image, used for editing excursions
   * param style: optional param with the style, used in editing excursion
   */
  var drawImage = function(image_url, area, style){    
	  var current_area;
	  var image_width = 325;  //initial image width
	  var image_style = "";
	
	  if(area){
  		current_area = area;
    }	else {
  		current_area = VISH.Editor.getCurrentArea();
    }
	
  	if(style){
  		image_style = style;
  		image_width = V.SlidesUtilities.getWidthFromStyle(style);
  	}
  	var template = VISH.Editor.getTemplate(); 
    var nextImageId = VISH.Editor.getId();
    var idToDragAndResize = "draggable" + nextImageId;
    current_area.attr('type','image');
    current_area.html("<img class='"+template+"_image' id='"+idToDragAndResize+"' title='Click to drag' src='"+image_url+"' style='"+style+"'/>");
    
    V.Editor.addDeleteButton(current_area);
    
    //the value to set the slider depends on the width if passed in the style, we have saved that value in image_width    
    var thevalue = image_width/325;
    $("#menubar").before("<div id='sliderId"+nextImageId+"' class='theslider'><input id='imageSlider"+nextImageId+"' type='slider' name='size' value='"+thevalue+"' style='display: none; '></div>");      
    
    //double size if header to insert image
    //I HAVE NOT DONE IT BECAUSE WE NEED TO CHANGE ALSO THE SLIDESMANAGER TO DISPLAY DOUBLE SIZE
    //if(current_area.attr('areaid')==="header"){
    //	current_area.css("height", "48px");
    //}
            
    $("#imageSlider"+nextImageId).slider({
      from: 1,
      to: 8,
      step: 0.5,
      round: 1,
      dimension: "x",
      skin: "blue",
      onstatechange: function( value ){
          $("#" + idToDragAndResize).width(325*value);
      }
    });
    $("#" + idToDragAndResize).draggable({
    	cursor: "move",
    	stop: function(){
    		$(this).parent().click();  //call parent click to select it in case it was unselected	
    	}
    });
  };
  
  
	return {
		init                : init,
		onLoadTab	          : onLoadTab,
		drawImage           : drawImage,
		drawUploadedElement : drawUploadedElement
	};

}) (VISH, jQuery);
