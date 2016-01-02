
function ewsConnect(requestBody){
	var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://mymailwdf.global.corp.sap/ews/Exchange.asmx", false); //URL muss noch über Resource eingebunden werden. so unschön!   ;true: asynchron
    xhr.setRequestHeader("Content-type","text/xml; charset=utf-8");
    xhr.withCredentials = true; //mit dieser Zeile wird ein Dialog gezeigt die Credentials einzugeben
    //xhr.addEventListener("load", this.ewsConnect_success, false);
	//xhr.addEventListener("abort", this.ewsConnect_abort, false);
    xhr.send(requestBody);
	var responseText = xhr.responseText;
	parser = new DOMParser();
	xmlDoc = parser.parseFromString(responseText, "text/xml");
	
	var response = new Object();
	response.xmlDoc = xmlDoc;
	response.status = xhr.status;
	response.statusText = xhr.statusText;
	
	return response;
}

function ewsConnect_success(xhr){
	var text = xhr.responseText;
	alert(text);
}

function ewsConnect_abort(evt){
	//needs to be implemented
	//use some kind of messageArea
}

/*
* Following methods processing the XML responses of the EWS requests
*/
function processResponseGeneric(xmlResponse){
	var responseCode = xmlResponse.getElementsByTagName("m:ResponseCode")[0].childNodes[0].nodeValue;
	if(responseCode = 'NoError'){
		return true;
	}else{
		return false;
	}
}
/* same as generic Response Processing; no additional information
processResponseAppointment: function(xmlResponse){
	var responseCode = xmlResponse.getElementsByTagName("m:ResponseCode")[0].childNodes[0].nodeValue;
	if(responseCode = 'NoError'){
		return true;
	}else{
		return false;
	}
},

processResponseSendEmail: function(xmlResponse){
	var responseCode = xmlResponse.getElementsByTagName("m:ResponseCode")[0].childNodes[0].nodeValue;
	if(responseCode = 'NoError'){
		return true;
	}else{
		return false;
	}
},*/

function processResponseFolderHierarchy(xmlResponse){		
	var json = this.xmlToJson(xmlResponse);
	var result;
	var responseClass = json["s:Envelope"]["s:Body"]["m:FindFolderResponse"]["m:ResponseMessages"]["m:FindFolderResponseMessage"]["@attributes"]["ResponseClass"];
	if(responseClass == "Success"){
		var arrayFolders = json["s:Envelope"]["s:Body"]["m:FindFolderResponse"]["m:ResponseMessages"]["m:FindFolderResponseMessage"]["m:RootFolder"]["t:Folders"]["t:Folder"];
		var isArray = this.isArray(arrayFolders);
		var arrayResult
		if(isArray){
			result = this.processResponseFolderHierarchyArray(arrayFolders, null, null);
		} else {
			result = this.processResponseFolderHierarchySingle(arrayFolders);
		}
		return result;		
	} else {
		return "failure";
	}
}

/*
 * For case: Folder Hierarchy contains only one folder. special case
 */
function processResponseFolderHierarchySingle(folderXML){
	var arrayFolders = [];	var result = new Object();		
	arrayFolders[0] = new Object();
	arrayFolders[0].folderId 	= folderXML["t:FolderId"]["@attributes"]["Id"];
	arrayFolders[0].displayName = folderXML["t:DisplayName"]["#text"];
	arrayFolders[0].unreadCount = parseInt(folderXML["t:TotalCount"]["#text"]);
	arrayFolders[0].totalCount 	= parseInt(folderXML["t:UnreadCount"]["#text"]);
	result.arrayFolders = arrayFolders;
	result.inbox_id = arrayFolders[0].folderId;
	return arrayFolders;
}

/*
 * For case: Folder Hierarchy contains more than one folder
 */
function processResponseFolderHierarchyArray(arrayFoldersXML, begin, end){
	var arrayFolders = [];
	var plus = 0;
	var cfc;
	var index;
	var child_begin;
	var child_end;
	var child_result;
	var child_addPlus;
	if((begin == null) && (end == null)){
		var result = new Object();
		var inbox_id;
		for	(index = 0; (index + plus) < arrayFoldersXML.length; index++) {
			cfc = 0; child_begin = 0; child_end = 0;
			arrayFolders[index] = new Object();
			arrayFolders[index].folderId 	= arrayFoldersXML[index+plus]["t:FolderId"]["@attributes"]["Id"];
			arrayFolders[index].displayName = arrayFoldersXML[index+plus]["t:DisplayName"]["#text"];
			arrayFolders[index].unreadCount = parseInt(arrayFoldersXML[index+plus]["t:UnreadCount"]["#text"]);
			arrayFolders[index].totalCount 	= parseInt(arrayFoldersXML[index+plus]["t:TotalCount"]["#text"]);
			arrayFolders[index].folderClass = arrayFoldersXML[index+plus]["t:FolderClass"]["#text"];
			arrayFolders[index].childFolderCount 	= parseInt(arrayFoldersXML[index+plus]["t:ChildFolderCount"]["#text"]);
			cfc = arrayFolders[index].childFolderCount;
			if(cfc > 0){
				child_begin = index + plus + 1;
				child_end = index + plus + cfc + 1;
				child_result = this.processResponseFolderHierarchyArray(arrayFoldersXML, child_begin, child_end); //bei end auch + 1 da das letzte Element zwar begrenzt aber nicht mehr dazugenommen wird
				arrayFolders[index].nodes = child_result.array;
				child_addPlus = child_result.addPlus;
				plus = plus + cfc + child_addPlus;
			}
			if(arrayFolders[index].displayName == "Inbox"){
				inbox_id = arrayFolders[index].folderId;
			}
		}
		result.arrayFolders = arrayFolders;
		result.inbox_id = inbox_id;
		return result;
	} else if((begin != null) && (end != null)){
		var result = new Object();
		var i = 0;
		for	(index = begin; index < end; index++) {
			cfc = 0; child_begin = 0; child_end = 0;
			arrayFolders[i] = new Object();
			arrayFolders[i].folderId 	= arrayFoldersXML[index+plus]["t:FolderId"]["@attributes"]["Id"];
			arrayFolders[i].displayName = arrayFoldersXML[index+plus]["t:DisplayName"]["#text"];
			arrayFolders[i].unreadCount = parseInt(arrayFoldersXML[index+plus]["t:UnreadCount"]["#text"]);
			arrayFolders[i].totalCount 	= parseInt(arrayFoldersXML[index+plus]["t:TotalCount"]["#text"]);
			
			arrayFolders[i].childFolderCount 	= parseInt(arrayFoldersXML[index+plus]["t:ChildFolderCount"]["#text"]);
			cfc = arrayFolders[i].childFolderCount;
			if(cfc > 0){
				child_begin = index + plus + 1;
				child_end = index + plus + cfc + 1;
				child_result = this.processResponseFolderHierarchyArray(arrayFoldersXML, child_begin, child_end);
				arrayFolders[i].nodes = child_result.array;//bei end auch + 1 da das letzte Element zwar begrenzt aber nicht mehr dazugenommen wird
				child_addPlus = child_result.addPlus;
				plus = plus + cfc + child_addPlus;
			}
			i = i + 1;
		}
		result.addPlus = plus;
		result.array = arrayFolders;
		return result;
	}
}

function processResponseEmailsOfFolder(xmlResponse, special){
	var json = this.xmlToJson(xmlResponse);
	var responseClass = json["s:Envelope"]["s:Body"]["m:FindItemResponse"]["m:ResponseMessages"]["m:FindItemResponseMessage"]["@attributes"]["ResponseClass"];
	if(responseClass == "Success"){
		var arrayOrigin = json["s:Envelope"]["s:Body"]["m:FindItemResponse"]["m:ResponseMessages"]["m:FindItemResponseMessage"]["m:RootFolder"]["t:Items"]["t:Message"];
		var arrayResult = [];
		if(arrayOrigin != null){
			var isArray = this.isArray(arrayOrigin);
			if(isArray){
				for	(index = 0; index < arrayOrigin.length; index++) {
					arrayResult[index] = new Object();
					arrayResult[index].itemId 			= arrayOrigin[index]["t:ItemId"]["@attributes"]["Id"];
					arrayResult[index].subject 			= this.getText(arrayOrigin[index]["t:Subject"]);
					arrayResult[index].dateTimeReceived = this.getText(arrayOrigin[index]["t:DateTimeReceived"]);
					arrayResult[index].dateTimeSent 	= this.getText(arrayOrigin[index]["t:DateTimeSent"]);
					arrayResult[index].hasAttachments 	= this.getText(arrayOrigin[index]["t:HasAttachments"]);
					if(special == "sent" || special == "drafts"){
						arrayResult[index].to				= this.getText(arrayOrigin[index]["t:DisplayTo"]);
					}
					else if(special == "outbox"){
						arrayResult[index].to 			= this.getText(arrayOrigin[index]["t:To"]["t:Mailbox"]["t:Name"]);
					}
					else if(special == "deleted"){
						if(arrayOrigin[index]["t:To"] != null){
							arrayResult[index].to 			= this.getText(arrayOrigin[index]["t:To"]["t:Mailbox"]["t:Name"]);
						}
						if(arrayOrigin[index]["t:From"] != null){
							arrayResult[index].from 		= this.getText(arrayOrigin[index]["t:From"]["t:Mailbox"]["t:Name"]);
						}
					} else {
						arrayResult[index].from 			= this.getText(arrayOrigin[index]["t:From"]["t:Mailbox"]["t:Name"]);
					}
					
					arrayResult[index].isRead 			= this.getText(arrayOrigin[index]["t:IsRead"]);
				}
			} else {
				arrayResult[0] = new Object();
				arrayResult[0].itemId 			= arrayOrigin["t:ItemId"]["@attributes"]["Id"];
				arrayResult[0].subject 			= this.getText(arrayOrigin["t:Subject"]);
				arrayResult[0].dateTimeReceived = this.getText(arrayOrigin["t:DateTimeReceived"]);
				arrayResult[0].dateTimeSent 	= this.getText(arrayOrigin["t:DateTimeSent"]);
				arrayResult[0].hasAttachments 	= this.getText(arrayOrigin["t:HasAttachments"]);
				if(special == "sent" || special == "drafts"){
					arrayResult[0].from				= this.getText(arrayOrigin["t:DisplayTo"]);
				}
				else if(special == "outbox"){
					arrayResult[0].from 			= this.getText(arrayOrigin["t:To"]["t:Mailbox"]["t:Name"]);
				} else {
					arrayResult[0].from 			= this.getText(arrayOrigin["t:From"]["t:Mailbox"]["t:Name"]);
				}
				
				arrayResult[0].isRead 			= this.getText(arrayOrigin["t:IsRead"]);
			}
		}
		return arrayResult;
	} else {
		return "failure";
	}
}

function processResponseEmail(xmlResponse){
	var json = this.xmlToJson(xmlResponse);
	
	var responseClass = json["s:Envelope"]["s:Body"]["m:GetItemResponse"]["m:ResponseMessages"]["m:GetItemResponseMessage"]["@attributes"]["ResponseClass"];
	if(responseClass == "Success"){
		var objectOrigin = json["s:Envelope"]["s:Body"]["m:GetItemResponse"]["m:ResponseMessages"]["m:GetItemResponseMessage"]["m:Items"]["t:Message"];
		var objectResult = new Object();
		
		objectResult.itemId 			= objectOrigin["t:ItemId"]["@attributes"]["Id"];
		objectResult.subject 			= this.getText(objectOrigin["t:Subject"]);
		objectResult.dateTimeSent 		= this.getText(objectOrigin["t:DateTimeSent"]);
		objectResult.hasAttachments 	= this.getText(objectOrigin["t:HasAttachments"]);
		objectResult.from				= new Object();
			objectResult.from.Name    	= this.getText(objectOrigin["t:From"]["t:Mailbox"]["t:Name"]);
			objectResult.from.Email		= this.getText(objectOrigin["t:From"]["t:Mailbox"]["t:EmailAddress"]);
		
		//List of To Recipients
		if(objectOrigin["t:ToRecipients"] != null){
			var to_isArray 	= this.isArray(objectOrigin["t:ToRecipients"]["t:Mailbox"]);
			objectResult.to	= [];
			if(to_isArray == true){
				for(index = 0; index < objectOrigin["t:ToRecipients"]["t:Mailbox"].length; index++){
					objectResult.to[index] = new Object();
					objectResult.to[index].name = objectOrigin["t:ToRecipients"]["t:Mailbox"][index]["t:Name"];
					objectResult.to[index].email = objectOrigin["t:ToRecipients"]["t:Mailbox"][index]["t:EmailAddress"];
					objectResult.to[index].type = objectOrigin["t:ToRecipients"]["t:Mailbox"][index]["t:MailboxType"];
				}
			} else if (to_isArray == false){
				objectResult.to[0] = new Object();
				objectResult.to[0].name = objectOrigin["t:ToRecipients"]["t:Mailbox"]["t:Name"];
				objectResult.to[0].email = objectOrigin["t:ToRecipients"]["t:Mailbox"]["t:EmailAddress"];
				objectResult.to[0].type = objectOrigin["t:ToRecipients"]["t:Mailbox"]["t:MailboxType"];
			}
		}
		
		//List of CC Recipients
		if(objectOrigin["t:CcRecipients"] != null){
			var cc_isArray 	= this.isArray(objectOrigin["t:CcRecipients"]["t:Mailbox"]);
			objectResult.cc	= [];
			if(cc_isArray == true){
				for(index = 0; index < objectOrigin["t:CcRecipients"]["t:Mailbox"].length; index++){
					objectResult.cc[index] = new Object();
					objectResult.cc[index].name = objectOrigin["t:CcRecipients"]["t:Mailbox"][index]["t:Name"];
					objectResult.cc[index].email = objectOrigin["t:CcRecipients"]["t:Mailbox"][index]["t:EmailAddress"];
					objectResult.cc[index].type = objectOrigin["t:CcRecipients"]["t:Mailbox"][index]["t:MailboxType"];
				}
			} else if (cc_isArray == false){
				objectResult.cc[0] = new Object();
				objectResult.cc[0].name = objectOrigin["t:CcRecipients"]["t:Mailbox"]["t:Name"];
				objectResult.cc[0].email = objectOrigin["t:CcRecipients"]["t:Mailbox"]["t:EmailAddress"];
				objectResult.cc[0].type = objectOrigin["t:CcRecipients"]["t:Mailbox"]["t:MailboxType"];
			}
		}
		
		//List of Attachments
		if(objectOrigin["t:Attachments"] != null){
			var att_isArray 	= this.isArray(objectOrigin["t:Attachments"]["t:FileAttachment"]);
			objectResult.att	= [];
			if(att_isArray == true){
				for(index = 0; index < objectOrigin["t:Attachments"]["t:FileAttachment"].length; index++){
					objectResult.att[index] = new Object();
					objectResult.att[index].id = objectOrigin["t:Attachments"]["t:FileAttachment"][index]["t:AttachmentId"]["@attributes"]["Id"];
					objectResult.att[index].name = this.getText(objectOrigin["t:Attachments"]["t:FileAttachment"][index]["t:Name"]);
					objectResult.att[index].size = this.getText(objectOrigin["t:Attachments"]["t:FileAttachment"][index]["t:Size"]);
				}
			} else if (att_isArray == false){
				objectResult.att[0] = new Object();
				objectResult.att[0].id = objectOrigin["t:Attachments"]["t:FileAttachment"]["t:AttachmentId"]["@attributes"]["Id"];
				objectResult.att[0].name = this.getText(objectOrigin["t:Attachments"]["t:FileAttachment"]["t:Name"]);
				objectResult.att[0].size = this.getText(objectOrigin["t:Attachments"]["t:FileAttachment"]["t:Size"]);
			}
		}
		
		objectResult.isRead = this.getText(objectOrigin["t:IsRead"]);
		objectResult.body	= this.getText(objectOrigin["t:Body"]);
		return objectResult;
	} else {
		return "failure";
	}
	
}

function processResponseAttachment(xmlResponse){
	var json = this.xmlToJson(xmlResponse);
	var objectOrigin;
	var objectResult;
	var isArray;
	var responseClass = json["s:Envelope"]["s:Body"]["m:GetAttachmentResponse"]["m:ResponseMessages"]["m:GetAttachmentResponseMessage"]["@attributes"]["ResponseClass"];
	if(responseClass == "Success"){
		objectOrigin = json["s:Envelope"]["s:Body"]["m:GetAttachmentResponse"]["m:ResponseMessages"]["m:GetAttachmentResponseMessage"]["m:Attachments"]["t:FileAttachment"];
		isArray = this.isArray(objectOrigin);
		if(isArray){
			for(index = 0; i < objectOrigin.length; index++){
				objectResult[index].name 	= objectOrigin[index]["t:Name"];
				objectResult[index].content = objectOrigin[index]["t:Content"];
			}
		} else {
			objectResult[0].name 	= objectOrigin["t:Name"];
			objectResult[0].content = objectOrigin["t:Content"];
		}
	} else {
		return "failure";
	}
}


/*
* Following methods creating the requestBodys for specific EWS requests
*/

function getRequestBodyAttachement(id){
	var requestBody = 
	'<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'+
	'	xmlns:xsd="http://www.w3.org/2001/XMLSchema"'+
	'	xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"'+
	'	xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">'+
	'<soap:Header>'+ 
	'<t:RequestServerVersion Version="Exchange2010" />'+ 
	'</soap:Header>'+ 
	  '<soap:Body>'+
	    '<GetAttachment xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"'+
	    '	xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">'+
	      '<AttachmentShape/>'+
	      '<AttachmentIds>'+
	        '<t:AttachmentId Id="'+id+'"/>'+
	      '</AttachmentIds>'+
	    '</GetAttachment>'+
	  '</soap:Body>'+
	'</soap:Envelope>';
	
	return requestBody;
}

function getRequestBodyAppointment(subject, body, startdate, starttime, enddate, endtime, isAllDayEvent, location){ //date: YYYY-DD-MM; time: hh:mm:ss
	var requestBody =  
	         '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'+
	         '      xmlns:xsd="http://www.w3.org/2001/XMLSchema"'+
	         '      xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"'+
	         '      xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">'+
	         '<soap:Body>'+
	         '<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"'+
	         '      xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types" '+
	         '      SendMeetingInvitations="SendToAllAndSaveCopy" >'+
	         '<SavedItemFolderId>'+
	         '<t:DistinguishedFolderId Id="calendar"/>'+
	         '</SavedItemFolderId>'+
	         '<Items>'+
	         '<t:CalendarItem xmlns="http://schemas.microsoft.com/exchange/services/2006/types">'+
	         '<Subject>'+subject+'</Subject>'+
	         '<Body BodyType="Text">'+body+'</Body>'+
	         //'<ReminderIsSet>true</ReminderIsSet>'+
	         //'<ReminderMinutesBeforeStart>60</ReminderMinutesBeforeStart>'+
	         '<Start>'+startdate+'T'+starttime+'</Start>'+
	         '<End>'+enddate+'T'+endtime+'</End>'+
	         '<IsAllDayEvent>'+isAllDayEvent+'</IsAllDayEvent>'+
	         '<LegacyFreeBusyStatus>Busy</LegacyFreeBusyStatus>'+
	         '<Location>'+location+'</Location>'+
	         '</t:CalendarItem>'+
	         '</Items>'+
	         '</CreateItem>'+
	         '</soap:Body>'+
	         '</soap:Envelope>';
	
	return requestBody;
}

function getRequestBodySendEmail(subject, body, ToRecipientsArray, CcRecipientsArray, BccRecipientsArray){
	var requestBody = 
	'<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'+ 
    '    xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"'+  
    '    xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types" '+ 
    '    xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">'+ 
	'<soap:Header>'+ 
	'<t:RequestServerVersion Version="Exchange2007_SP1" />'+ 
	'</soap:Header>'+ 
	'<soap:Body>'+ 
	 '<m:CreateItem MessageDisposition="SendAndSaveCopy">'+ 
	   '<m:SavedItemFolderId>'+ 
	     '<t:DistinguishedFolderId Id="sentitems" />'+ 
	   '</m:SavedItemFolderId>'+ 
	   '<m:Items>'+ 
	     '<t:Message>'+ 
	       '<t:Subject>'+subject+'</t:Subject>'+ 
	       '<t:Body BodyType="HTML">'+body+'</t:Body>';
	if(ToRecipientsArray != null){
		requestBody = requestBody + '<t:ToRecipients>';
		var index;
		for	(index = 0; index < ToRecipientsArray.length; index++) {
			requestBody = requestBody + '<t:Mailbox><t:EmailAddress>'+ToRecipientsArray[index]+'</t:EmailAddress>'+'</t:Mailbox>';
		}
		requestBody = requestBody + '</t:ToRecipients>';
	}
	
	if(CcRecipientsArray != null){
		requestBody = requestBody + '<t:CcRecipients>';
		var index;
		for	(index = 0; index < CcRecipientsArray.length; index++) {
			requestBody = requestBody + '<t:Mailbox><t:EmailAddress>'+CcRecipientsArray[index]+'</t:EmailAddress>'+'</t:Mailbox>';
		}
		requestBody = requestBody + '</t:CcRecipients>';
	}
	
	if(BccRecipientsArray != null){
		requestBody = requestBody + '<t:BccRecipients>';
		var index;
		for	(index = 0; index < BccRecipientsArray.length; index++) {
			requestBody = requestBody + '<t:Mailbox><t:EmailAddress>'+BccRecipientsArray[index]+'</t:EmailAddress>'+'</t:Mailbox>';
		}
		requestBody = requestBody + '</t:BccRecipients>';
	}
	
	requestBody = requestBody + '</t:Message></m:Items></m:CreateItem></soap:Body></soap:Envelope>';
}

function getRequestBodyFolderHierarchy(){
	var requestBody = 
	'<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'+
    '    xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"'+
    '    xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"'+
    '    xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">'+
	'<soap:Header>'+
	' <t:RequestServerVersion Version="Exchange2007_SP1" />'+
	'</soap:Header>'+
	'<soap:Body>'+
	' <m:FindFolder Traversal="Deep">'+
	 '  <m:FolderShape>'+
	  '   <t:BaseShape>AllProperties</t:BaseShape>'+
	   '  <t:AdditionalProperties>'+
	    '   <t:FieldURI FieldURI="folder:DisplayName" />'+
	     '  <t:ExtendedFieldURI PropertyTag="4340"'+
	     '                      PropertyType="Boolean" />'+
	     '</t:AdditionalProperties>'+
	   '</m:FolderShape>'+
	   '<m:IndexedPageFolderView MaxEntriesReturned="100"'+
	   '                         Offset="0"'+
	    '                        BasePoint="Beginning" />'+
	   '<m:ParentFolderIds>'+
	   '  <t:DistinguishedFolderId Id="msgfolderroot" />'+
	   '</m:ParentFolderIds>'+
	 '</m:FindFolder>'+
	'</soap:Body>'+
	'</soap:Envelope>';
	
	return requestBody;
}

function getRequestBodyEmailsOfFolder(folderId){
	var requestBody = 
	'<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '+
    '    xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages" '+
    '    xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types" '+
    '    xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">'+
	'<soap:Header>'+
	' <t:RequestServerVersion Version="Exchange2010_SP1" />'+
	'</soap:Header>'+
	'<soap:Body>'+
	' <m:FindItem Traversal="Shallow">'+
	'   <m:ItemShape>'+
	'     <t:BaseShape>AllProperties</t:BaseShape>'+
	'     <t:AdditionalProperties>'+
	'       <t:FieldURI FieldURI="item:Subject" />'+
	'       <t:FieldURI FieldURI="item:DateTimeReceived" />'+
	'       <t:FieldURI FieldURI="message:From" />'+
	'     </t:AdditionalProperties>'+
	'   </m:ItemShape>'+
	'   <m:IndexedPageItemView Offset="0" BasePoint="Beginning" />'+
	'   <m:ParentFolderIds>'+
	'       <t:FolderId Id="'+folderId+'"/>'+
	'   </m:ParentFolderIds>'+
	' </m:FindItem>'+
	'</soap:Body>'+
	'</soap:Envelope>';
	
	return requestBody;

}

function getRequestBodyEmail(itemId){
	var requestBody = 
	'<?xml version="1.0" encoding="utf-8"?>'+
	'<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '+
	'               xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"'+ 
	'               xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types" '+
	'               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">'+
	'  <soap:Header>'+
	'    <t:RequestServerVersion Version="Exchange2010" />'+
	'  </soap:Header>'+
	'  <soap:Body>'+
	'    <m:GetItem>'+
	'      <m:ItemShape>'+
	'        <t:BaseShape>AllProperties</t:BaseShape>'+
	'        <t:AdditionalProperties>'+
	'          <t:FieldURI FieldURI="item:Subject" />'+
	'        </t:AdditionalProperties>'+
	'      </m:ItemShape>'+
	'     <m:ItemIds>'+
	'        <t:ItemId Id="'+itemId+'" />'+
	'      </m:ItemIds>'+
	'    </m:GetItem>'+
	'  </soap:Body>'+
	'</soap:Envelope>';
	
	return requestBody;
}

function getRequestBodySaveDraft(subject, body, ToRecipientsArray, CcRecipientsArray, BccRecipientsArray){
	var requestBody = 
		'<?xml version="1.0" encoding="utf-8"?>'+
		'<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"'+
		  ' xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">'+
		 ' <soap:Header>'+
	'    <t:RequestServerVersion Version="Exchange2010" />'+
	'  </soap:Header>'+
		  '<soap:Body>'+
		    '<CreateItem MessageDisposition="SendAndSaveCopy" xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">'+
		      '<SavedItemFolderId>'+
		        '<t:DistinguishedFolderId Id="drafts" />'+
		      '</SavedItemFolderId>'+
		      '<Items>'+
		        '<t:Message>'+
		          '<t:ItemClass>IPM.Note</t:ItemClass>'+
		          '<t:Subject>' + subject + '</t:Subject>'+
		          '<t:Body BodyType="Text">' + body + '</t:Body>';
		          
		          if(ToRecipientsArray != null && ToRecipientsArray.length > 0){
						requestBody = requestBody + '<t:ToRecipients>';
						var index;
						for	(index = 0; index < ToRecipientsArray.length; index++) {
							requestBody = requestBody + '<t:Mailbox><t:EmailAddress>'+ToRecipientsArray[index]+'</t:EmailAddress>'+'</t:Mailbox>';
						}
						requestBody = requestBody + '</t:ToRecipients>';
				   }
					
				  if(CcRecipientsArray != null && CcRecipientsArray.length > 0){
						requestBody = requestBody + '<t:CcRecipients>';
						var index;
						for	(index = 0; index < CcRecipientsArray.length; index++) {
							requestBody = requestBody + '<t:Mailbox><t:EmailAddress>'+CcRecipientsArray[index]+'</t:EmailAddress>'+'</t:Mailbox>';
						}
						requestBody = requestBody + '</t:CcRecipients>';
				   }
					
				  if(BccRecipientsArray != null && BccRecipientsArray.length > 0){
						requestBody = requestBody + '<t:BccRecipients>';
						var index;
						for	(index = 0; index < BccRecipientsArray.length; index++) {
							requestBody = requestBody + '<t:Mailbox><t:EmailAddress>'+BccRecipientsArray[index]+'</t:EmailAddress>'+'</t:Mailbox>';
						}
						requestBody = requestBody + '</t:BccRecipients>';
				  }
				  
				  requestBody +=
		          '<t:IsRead>false</t:IsRead>'+
		        '</t:Message>'+
		      '</Items>'+
		    '</CreateItem>'+
		  '</soap:Body>'+
		'</soap:Envelope>';
}


function xmlToJson(xml) {
	
	// Create the return object
	var obj = {};

	if (xml.nodeType == 1) { // element
		// do attributes
		if (xml.attributes.length > 0) {
		obj["@attributes"] = {};
			for (var j = 0; j < xml.attributes.length; j++) {
				var attribute = xml.attributes.item(j);
				obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
			}
		}
	} else if (xml.nodeType == 3) { // text
		obj = xml.nodeValue;
	}

	// do children
	if (xml.hasChildNodes()) {
		for(var i = 0; i < xml.childNodes.length; i++) {
			var item = xml.childNodes.item(i);
			var nodeName = item.nodeName;
			if (typeof(obj[nodeName]) == "undefined") {
				obj[nodeName] = this.xmlToJson(item);
			} else {
				if (typeof(obj[nodeName].push) == "undefined") {
						var old = obj[nodeName];
						obj[nodeName] = [];
						obj[nodeName].push(old);
					}
					obj[nodeName].push(this.xmlToJson(item));
				}
			}
		}
		return obj;
	}

function isArray(myArray) {
	if(myArray != null){
		return myArray.constructor.toString().indexOf("Array") > -1;
} else {
	return "isNull";
	}
}

function getText(objectOrNot){
	if(typeof objectOrNot === 'object'){
	return objectOrNot["#text"];
	} else {
		return objectOrNot;
	}
}