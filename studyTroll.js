//
//  Study Troll Jetpack V1.0
//		http://www.StudyTroll.com
// 		written by Michael Fischthal
//		art by Amelia Altavena and Micheline Hess
//			March 2010
//
//  This work is licensed under a Creative Commons License: http://creativecommons.org/licenses/by-nc-sa/3.0/

jetpack.future.import("selection");
jetpack.future.import("menu");
jetpack.future.import("storage.simple");
jetpack.future.import("slideBar");
jetpack.future.import("clipboard");
jetpack.future.import("pageMods");
jetpack.future.import("me");

var currDoc = jetpack.tabs.focused.contentDocument;
var trollTimerLength = 4*60*1000;
var warningTimerLength = 6000;
var reminderTimerLength = 60000;
var reminderEnabled = true;
var trollEnabled = true;
var randomFactCount = 0;
var currText = "";
var currLetter = 0;
var currWord = 0;
var totalLetters = 0;
var hintCount = 0;
var maxHints = 2;
var correctLetters = "";
var currFact;
var brokenText = [];
var addedWords = [];
var blankChar = "_"
var trollTimer;
var warningTimer;
var reminderTimer;
var myStorage = jetpack.storage.simple;
var quizActive = false;
var useCopyProtection = true;
var maxWords = 60;
var maxChars = 300;
var debugMode = false;
var pageModCurrent = "";

var MODE = "FIRSTLOAD";
//possible MODE values: ON OFF WARNING and FIRSTLOAD
var DIFF = "EASY";
//possible DIFF values: EASY MED HARD

//Sample fact to add when set is empty
var startingFact =
{
    text: "Feed the Troll to get started.  Your facts (including this one) can be edited or removed by clicking on the side bar.",
    keyWords: ["2", "16"],
    right: 0,
    wrong: 0,
    source: "http://www.StudyTroll.com",
    active: 1,
    id: 0
}

//About me page and pagemods
var manifest = {
    firstRunPage: "http://www.studytroll.com/aboutMe.html",
};
var options = {};
options.matches = ["http://www.quizlet.com/*/", "http://quizlet.com/*/"];
jetpack.pageMods.add(quizletListAvailable, options);
jetpack.me.onFirstRun(function(){  
	startTimer();
});

function initFactList() {
	try {
        if (myStorage.activeFacts == null) myStorage.activeFacts = [];
        if (myStorage.myFacts.length > 0) {
            console.log("loaded " + myStorage.myFacts.length + " facts");
        } else {
            console.log("fact list is empty");
            myStorage.myFacts.push(startingFact);
            myStorage.activeFacts = [0];
        }
    } catch(err) {
        console.log("Loading error " + err);
        myStorage.myFacts = [];
        myStorage.activeFacts = [];
    }
}

//Set statusbar
var myStatusObj;
jetpack.statusBar.append({
    html:
    "<HTML><BODY bgcolor='#FFFFFF'><div id='statusbar' style='cursor:pointer;font-weight:bold;top:0px:left:0px;font-size:7pt'></div></BODY></HTML>",
    width: 75,
    onReady: function(widget) {
        //Load saved facts on jetpack start
        //If no saved facts, add starting fact
        myStatusObj = widget;
        jetpack.tabs.onReady(addStylesToPage);
        addStylesToPage(jetpack.tabs.focused.contentDocument);
        initFactList();
		if (MODE=="ON") {
			$("#statusbar", widget).html("<img src='http://www.studytroll.com/imgs/on.gif' alt='StudyTroll:ON' title='Quizzing is ON'>");
		} else if (MODE=="OFF") {
			$("#statusbar", widget).html("<img src='http://www.studytroll.com/imgs/off.png' alt='StudyTroll:OFF' title='Quizzing is OFF'>");
		} else if (MODE=="WARNING") {
			$("#statusbar", widget).html("<img src='http://www.studytroll.com/imgs/warning.gif?" + rndNum + "' title='The Troll is coming!'");
		}
		$(widget).hover(
        function() {
			if (MODE!="WARNING") $("#statusbar", widget).html("<center><span style='top:4px;line-height=150%;font-size:8pt'>Troll is "+MODE+"</span></center>");
			else $("#statusbar", widget).html("<center><span style='top:4px;line-height=150%;font-size:8pt'>Troll Warning</span></center>");
			
        },
        function() {
            if (MODE=="ON") {
				$("#statusbar", widget).html("<img src='http://www.studytroll.com/imgs/on.gif' alt='StudyTroll:ON' title='Quizzing is ON'>");
			} else if (MODE=="OFF") {
				$("#statusbar", widget).html("<img src='http://www.studytroll.com/imgs/off.png' alt='StudyTroll:OFF' title='Quizzing is OFF'>");
			} else if (MODE=="WARNING") {
				$("#statusbar", widget).html("<img src='http://www.studytroll.com/imgs/warning.gif?" + rndNum + "' title='The Troll is coming!'");
			}	
        }
        );
        $(widget).click(function() {
            if (MODE == "OFF") {
                console.log("CLICK- turning on troll");
                startTimer();
            } else if (MODE == "WARNING") {
                clearTimeout(warningTimer);
                clearTimeout(trollTimer);
                startTimer();
                console.log("CLICK- cancelling troll");
            } else if (MODE == "ON") {
                clearTimeout(trollTimer);
                stopTimer();
                console.log("CLICK- turning off troll");
            }
			if (MODE=="ON") {
				$("#statusbar", widget).html("<img src='http://www.studytroll.com/imgs/on.gif' alt='StudyTroll:ON' title='Quizzing is ON'>");
			} else if (MODE=="OFF") {
				$("#statusbar", widget).html("<img src='http://www.studytroll.com/imgs/off.png' alt='StudyTroll:OFF' title='Quizzing is OFF'>");
			} else if (MODE=="WARNING") {
				$("#statusbar", widget).html("<img src='http://www.studytroll.com/imgs/warning.gif?" + rndNum + "' title='The Troll is coming!'");
			}
        });
    }
});

//Create empty Slidebar
jetpack.slideBar.append({
    html: <html > <head > </head><body bgcolor="#DDDDDD">
	      	<div id="trollSlideBarContent">
			</div > </body></html > ,
    icon: "http://www.studytroll.com/imgs/troll_ico.png",
    width: 430,
    persist: false,
    onClick: function(slide) {
        //Load contents
        if (!quizActive) updateSlideBarContents(slide);
        else $("#trollSlideBarContent", slide.contentDocument).html("<center>Sorry, your facts are not available while the troll is in control!  He doesn't like cheaters.<center>");
    }
});

//Update the contents of the slidebar
function updateSlideBarContents(slide) {

    var myTable = "<div id='settingsBtn' style='font-size:10pt;text-align:right;cursor:pointer;color:blue;font-family:arial,helvetica,geneva,swiss'><img src='http://www.studytroll.com/imgs/settingsBtn.png' border=0 align=absbottom> <span style='text-decoration:underline;'>SETTINGS</span></div><div id='settings' style='display:none' visible='false'>"+settingsHTML+"</div>";
	myTable += "<table border=\"0\" cellspacing=\"0\" cellpadding=\"7\" style=\"font-family:arial,helvetica,geneva,swiss;font-size:10pt;margin-top:5px\">";
    myTable += "<tr style=\"background:rgb(208,208,208)\">";
    myTable += "<th width=\"40\">ON/OFF</th>";
    myTable += "<th width=\"260\" align=\"center\">  ITEM</th>";
    myTable += "<th width=\"40\">CORRECT/<br>TOTAL</th>";
    myTable += "<th width=\"50\"></th>";
    myTable += "<th width=\"80\"></th>";
    myTable += "</tr>";
    for (i = 0; i < myStorage.myFacts.length; i++) {
        brokenText = myStorage.myFacts[i].text.split(" ");
        var printText = "";
        for (j = 0; j < brokenText.length; j++) {
            var thisWord = brokenText[j];
            if (myStorage.myFacts[i].keyWords.indexOf(j.toString()) < 0) {
                printText += thisWord + " ";
            } else {
                printText += "_____ ";
            }
        }
        if (i % 2 == 0) myTable += "<tr style=\"background:rgb(235,235,235)\">";
        else myTable += "<tr>";
        if (myStorage.myFacts[i].active == 1) {
            myTable += "<td align=\"center\"><div class=\"onToggleBtn\" style=\"color:black;text-decoration:none;font-size:8pt;cursor:pointer\" num=\"" + i + "\"><img src=\"http://www.studytroll.com/imgs/lightOn.png\" border=0></div></td>";
        } else {
            myTable += "<td align=\"center\"><div class=\"onToggleBtn\" style=\"color:black;text-decoration:none;font-size:8pt;cursor:pointer\" num=\"" + i + "\"><img src=\"http://www.studytroll.com/imgs/lightOff.png\" border=0></div></td>";
        }
        myTable += "<td>" + printText + "<br><span style=\"font-size:7pt\"><a target=\"new\" href=\"" + myStorage.myFacts[i].source + "\">(FROM: " + myStorage.myFacts[i].source.substr(6) + ")</a></span></td>";
        myTable += "<td align=\"center\">" + myStorage.myFacts[i].right + " / " + (parseInt(myStorage.myFacts[i].right) + parseInt(myStorage.myFacts[i].wrong)) + "</td>";
        myTable += "<td align=\"center\"><div class=\"editBtn\" style=\"color:black;text-decoration:none;font-size:8pt;cursor:pointer\" num=\"" + i + "\"><img src=\"http://www.studytroll.com/imgs/edit_ico.png\" title=\"Edit Fact\" border=0 align=absbottom></div></td>";
        myTable += "<td align=\"center\"><div class=\"removeBtn\" style=\"color:black;text-decoration:none;font-size:8pt;cursor:pointer\" num=\"" + i + "\"><img src=\"http://www.studytroll.com/imgs/delete_ico.png\" title=\"Remove Fact\" border=0 align=absbottom></div></td>";
        myTable += "</tr>";
    }
    myTable += "</table>";
	myTable += "<div id='exportBtn' style='cursor:pointer;position:relative;font-size:10pt;font-family:arial,helvetica,geneva,swiss;color:blue;margin-top:5px' align='right'><img src='http://www.studytroll.com/imgs/export.png' border=0 align=absbottom> <span style='text-decoration:underline;'>EXPORT</span></div>"
    var doc = slide.contentDocument;
    $("#trollSlideBarContent", doc).html(myTable);
	$(".copyProt", slide.contentDocument).bind("click",
    function(e) {
        if (!useCopyProtection) {
			useCopyProtection = true;
			console.log("copy protection on");
			//updateSlideBarContents(slide);
			$("#copyProtSpan", slide.contentDocument).html("<center><span style='font-size:11pt'><b>[Copy Protection is ON]</b></span><br><span style='font-size:9pt'>This prevents cheating by disabling<br>copying of the fact you are being quizzed on.<br><span style=\"color:blue;text-decoration:none;font-size:8pt;cursor:pointer\">CLICK HERE TO TURN IT OFF.</span><br><br>");
		} else {
			useCopyProtection = false;
			console.log("copy protection off");
			//updateSlideBarContents(slide);
			$("#copyProtSpan", slide.contentDocument).html("<center><span style='font-size:11pt'><b>[Copy Protection is OFF]</b></span><br><span style='font-size:9pt'>When turned on, this prevents cheating by disabling<br>copying of the fact you are being quizzed on.<br><span style=\"color:blue;text-decoration:none;font-size:8pt;cursor:pointer\">CLICK HERE TO TURN IT ON.</span><br><br>");
		}
    });
	$("#exportBtn", slide.contentDocument).bind("click",
    function(e) {
       exportData();
    });
	$("#settingsBtn", slide.contentDocument).bind("click",
    function(e) {
		//console.log($("#settings", slide.contentDocument).attr('style'));
        if ($("#settings", slide.contentDocument).attr('style')=="display: none;") {
			$("#settings", slide.contentDocument).attr('style', 'display:block;');
		} else {
			$("#settings", slide.contentDocument).attr('style', 'display:none;');
		}
    });
	//SETTINGS:
	//make sure settings exist:
	try {
		if (myStorage.mySettings==null) {
			myStorage.mySettings = {reminder:reminderTimerLength, trollTimer:trollTimerLength, difficulty:"MED"};
		}
	} catch (err) {
		myStorage.mySettings = {reminder:reminderTimerLength, trollTimer:trollTimerLength, difficulty:"MED"};
	}
	$("#r30s", slide.contentDocument).bind("click",
    function(e) {
        $("#r30s", slide.contentDocument).attr('style', 'text-decoration:none;color:black !important');
	    $("#r60s", slide.contentDocument).attr('style', 'text-decoration:underline');
	 	$("#r90s", slide.contentDocument).attr('style', 'text-decoration:underline');
	 	$("#roff", slide.contentDocument).attr('style', 'text-decoration:underline');
		myStorage.mySettings.reminder = 30*1000;
		reminderTimerLength = 30*1000;
		reminderEnabled = true;
    });
	$("#r60s", slide.contentDocument).bind("click",
    function(e) {
        $("#r60s", slide.contentDocument).attr('style', 'text-decoration:none !important;color:black !important');
	    $("#r30s", slide.contentDocument).attr('style', 'text-decoration:underline');
	 	$("#r90s", slide.contentDocument).attr('style', 'text-decoration:underline');
	 	$("#roff", slide.contentDocument).attr('style', 'text-decoration:underline');
		myStorage.mySettings.reminder = 60*1000;
		reminderTimerLength = 60*1000;
		reminderEnabled = true;
    });
	$("#r90s", slide.contentDocument).bind("click",
    function(e) {
        $("#r90s", slide.contentDocument).attr('style', 'text-decoration:none !important;color:black !important');
	    $("#r60s", slide.contentDocument).attr('style', 'text-decoration:underline');
	 	$("#r30s", slide.contentDocument).attr('style', 'text-decoration:underline');
	 	$("#roff", slide.contentDocument).attr('style', 'text-decoration:underline');
		myStorage.mySettings.reminder = 90*1000;
		reminderTimerLength = 90*1000;
		reminderEnabled = true;
    });
	$("#roff", slide.contentDocument).bind("click",
    function(e) {
        $("#roff", slide.contentDocument).attr('style', 'text-decoration:none !important;color:black !important');
	    $("#r60s", slide.contentDocument).attr('style', 'text-decoration:underline');
	 	$("#r30s", slide.contentDocument).attr('style', 'text-decoration:underline');
	 	$("#r90s", slide.contentDocument).attr('style', 'text-decoration:underline');
		myStorage.mySettings.reminder = 0;
		reminderEnabled = false;
        clearTimeout(reminderTimer);
    });
	//
	$("#t2m", slide.contentDocument).bind("click",
    function(e) {
        $("#t2m", slide.contentDocument).attr('style', 'text-decoration:none;color:black !important');
	    $("#t4m", slide.contentDocument).attr('style', 'text-decoration:underline');
	 	$("#t6m", slide.contentDocument).attr('style', 'text-decoration:underline');
	 	$("#toff", slide.contentDocument).attr('style', 'text-decoration:underline');
		myStorage.mySettings.trollTimer = 2*60*1000;
		trollTimerLength = 2*60*1000;
		trollEnabled = true;
    });
	$("#t4m", slide.contentDocument).bind("click",
	function(e) {
        $("#t4m", slide.contentDocument).attr('style', 'text-decoration:none;color:black !important');
	    $("#t2m", slide.contentDocument).attr('style', 'text-decoration:underline');
	 	$("#t6m", slide.contentDocument).attr('style', 'text-decoration:underline');
	 	$("#toff", slide.contentDocument).attr('style', 'text-decoration:underline');
		myStorage.mySettings.trollTimer = 4*60*1000;
		trollTimerLength = 4*60*1000;
		trollEnabled = true;
    });
	$("#t6m", slide.contentDocument).bind("click",
	function(e) {
        $("#t6m", slide.contentDocument).attr('style', 'text-decoration:none;color:black !important');
	    $("#t4m", slide.contentDocument).attr('style', 'text-decoration:underline');
	 	$("#t2m", slide.contentDocument).attr('style', 'text-decoration:underline');
	 	$("#toff", slide.contentDocument).attr('style', 'text-decoration:underline');
		myStorage.mySettings.trollTimer = 4*60*1000;
		trollTimerLength = 6*60*1000;
		trollEnabled = true;
    });
	$("#toff", slide.contentDocument).bind("click",
    function(e) {
        $("#toff", slide.contentDocument).attr('style', 'text-decoration:none !important;color:black !important');
	    $("#t2m", slide.contentDocument).attr('style', 'text-decoration:underline');
	 	$("#t4m", slide.contentDocument).attr('style', 'text-decoration:underline');
	 	$("#t6m", slide.contentDocument).attr('style', 'text-decoration:underline');
		myStorage.mySettings.trollTimer = 0;
		trollEnabled = false;
        clearTimeout(trollTimer);
    });
	//
	$("#easy", slide.contentDocument).bind("click",
    function(e) {
        $("#easy", slide.contentDocument).attr('style', 'text-decoration:none;color:black !important');
	    $("#med", slide.contentDocument).attr('style', 'text-decoration:underline');
	 	$("#hard", slide.contentDocument).attr('style', 'text-decoration:underline');
		myStorage.mySettings.difficulty = "EASY";
		DIFF = "EASY";
    });
	$("#med", slide.contentDocument).bind("click",
	function(e) {
        $("#med", slide.contentDocument).attr('style', 'text-decoration:none;color:black !important');
	    $("#easy", slide.contentDocument).attr('style', 'text-decoration:underline');
	 	$("#hard", slide.contentDocument).attr('style', 'text-decoration:underline');
		myStorage.mySettings.difficulty = "MED";
		DIFF = "MED";
    });
	$("#hard", slide.contentDocument).bind("click",
	function(e) {
        $("#hard", slide.contentDocument).attr('style', 'text-decoration:none;color:black !important');
	    $("#med", slide.contentDocument).attr('style', 'text-decoration:underline');
	 	$("#easy", slide.contentDocument).attr('style', 'text-decoration:underline');
		myStorage.mySettings.difficulty = "HARD";
		DIFF = "HARD";
    });
	//
    $(".removeBtn", slide.contentDocument).bind("click",
    function(e) {
        console.log("clicked remove num " + $(this).attr('num'));
        myID = myStorage.myFacts[parseInt($(this).attr('num'))].id;
        myStorage.activeFacts.splice(myStorage.activeFacts.indexOf(myID), 1);
        myStorage.myFacts.splice(parseInt($(this).attr('num')), 1);
        updateSlideBarContents(slide);
    });
    $(".editBtn", slide.contentDocument).bind("click",
    function(e) {
        console.log("clicked edit num " + $(this).attr('num'));
        editFact(parseInt($(this).attr('num')), slide)
    });
    $(".onToggleBtn", slide.contentDocument).bind("click",
    function(e) {
        console.log("toggled num " + $(this).attr('num'));
        myID = myStorage.myFacts[$(this).attr('num')].id;
        console.log("id " + myID);
        if (myStorage.myFacts[$(this).attr('num')].active == 1) {
            myStorage.myFacts[$(this).attr('num')].active = "0";
            myStorage.activeFacts.splice(myStorage.activeFacts.indexOf(myID), 1);
        }
        else {
            myStorage.myFacts[$(this).attr('num')].active = "1";
            myStorage.activeFacts.push(myID);
        }
        updateSlideBarContents(slide);
    });
	if (myStorage.mySettings.reminder == 0) 
	{
		$("#roff", slide.contentDocument).attr('style', 'text-decoration:none;color:black !important');
		reminderEnabled == false;
	}
	else if (myStorage.mySettings.reminder == 30000) 
	{
		$("#r30s", slide.contentDocument).attr('style', 'text-decoration:none;color:black !important');
		reminderTimerLength == 30000;
	}
	else if (myStorage.mySettings.reminder == 60000) 
	{
		$("#r60s", slide.contentDocument).attr('style', 'text-decoration:none;color:black !important');
		reminderTimerLength == 60000;
	}
	else if (myStorage.mySettings.reminder == 90000) 
	{
		$("#r90s", slide.contentDocument).attr('style', 'text-decoration:none;color:black !important');
		reminderTimerLength == 90000;
	}
	if (myStorage.mySettings.trollTimer == 0) 
	{
		$("#toff", slide.contentDocument).attr('style', 'text-decoration:none;color:black !important');
		trollEnabled == false;
	}
	else if (myStorage.mySettings.trollTimer == 2*60*1000) 
	{
		$("#t2m", slide.contentDocument).attr('style', 'text-decoration:none;color:black !important');
		trollTimerLength == 2*60*1000;
	}
	else if (myStorage.mySettings.trollTimer == 4*60*1000) 
	{
		$("#t4m", slide.contentDocument).attr('style', 'text-decoration:none;color:black !important');
		trollTimerLength == 4*60*1000;
	}
	else if (myStorage.mySettings.trollTimer == 6*60*1000) 
	{
		$("#t6m", slide.contentDocument).attr('style', 'text-decoration:none;color:black !important');
		trollTimerLength == 6*60*1000;
	}
	if (myStorage.mySettings.difficulty == "EASY") 
	{
		$("#easy", slide.contentDocument).attr('style', 'text-decoration:none;color:black !important');
		DIFF = myStorage.mySettings.difficulty;
	}
	else if (myStorage.mySettings.difficulty == "MED") 
	{
		$("#med", slide.contentDocument).attr('style', 'text-decoration:none;color:black !important');
		DIFF = myStorage.mySettings.difficulty;
	}
	else if (myStorage.mySettings.difficulty == "HARD") 
	{
		$("#hard", slide.contentDocument).attr('style', 'text-decoration:none;color:black !important');
		DIFF = myStorage.mySettings.difficulty;
	}
	if (useCopyProtection) {
		$("#copyProtSpan", slide.contentDocument).html("<center><span style='font-size:11pt'><b>[Copy Protection is ON]</b></span><br><span style='font-size:9pt'>This prevents cheating by disabling<br>copying of the fact you are being quizzed on.<br><span style=\"color:blue;text-decoration:none;font-size:8pt;cursor:pointer\">CLICK HERE TO TURN IT OFF.</span><br><br>");
	} else {
		$("#copyProtSpan", slide.contentDocument).html("<center><span style='font-size:11pt'><b>[Copy Protection is OFF]</b></span><br><span style='font-size:9pt'>When turned on, this prevents cheating by disabling<br>copying of the fact you are being quizzed on.<br><span style=\"color:blue;text-decoration:none;font-size:8pt;cursor:pointer\">CLICK HERE TO TURN IT ON.</span><br><br>");
	}
}

//Drops a bone from the top of the screen with a random active fact
function showRandomBoneFact() {
    //immidiately start timer again so facts build up
    currDoc = jetpack.tabs.focused.contentDocument;
    var randomFactNum = myStorage.activeFacts[Math.floor(Math.random() * myStorage.activeFacts.length)];
    currFact = getFactByID(randomFactNum);
    //split up text and underline the keywords for emphasis
    brokenText = currFact.text.split(" ");
    var printText = "";
    var letterCount = 0;
    for (i = 0; i < brokenText.length; i++) {
        var thisWord = brokenText[i];
        var newWord = "";
        if (currFact.keyWords.indexOf(i.toString()) >= 0) {
            thisWord = "<span style=\"text-decoration:underline\">" + thisWord + "</span> ";
        } else {
            thisWord = "<span style=\"text-decoration:none\">" + thisWord + "</span> ";
        }
        printText += thisWord;
        totalLetters = letterCount;
    }
    //if a bone has already been added to the document, clone it
    //otherwise add a new bone element to the document.
    //
    //NOTE: this may not be the best approach but is a hack that has worked.
    //Should revisit with a more professional opinion
    if ($("#bigBone", currDoc).length > 0) {
        console.log("already a fact on stage");
        animatePx = jetpack.tabs.focused.contentWindow.innerHeight + 25;
        itemWidth = 710;
        randomX1 = Math.floor(Math.random() * (jetpack.tabs.focused.contentWindow.innerWidth - itemWidth));
        $("#bigBone", currDoc).clone(true).insertBefore($("#bigBone:last", currDoc));
        $("#bigBone:first", currDoc).css("margin-top", "0px");
        $("#bigBone:first", currDoc).css("z-index", findHighestZ() + 1);
        $("#bigBone:first", currDoc).css("left", randomX1 + "px");
        $("#boneCopy:first", currDoc).html("<center><span style='" + stylesObj.trollText + "'>" + printText + "</span></center>");
        $("#bigBone:first", currDoc).each(function() {
            var randomNumber = Math.floor(Math.random() * 50) - 25;
            $(this).css("-moz-transform", "rotate(" + randomNumber + "deg)");
        });
        $("#bigBone:first", currDoc).animate({
            marginTop: animatePx + "px"
        },
        500,
        function() {}
        );
    } else {
        boneCopy.innerHTML = "<center><span style='" + stylesObj.trollText + "'>" + printText + "</span></center>";
        bigBone.style.zIndex = findHighestZ() + 1;
        itemWidth = 710;
        randomX1 = Math.floor(Math.random() * (jetpack.tabs.focused.contentWindow.innerWidth - itemWidth));
        bigBone.style.left = randomX1 + "px";
        bigBone.style.marginTop = "0px";
        currDoc.body.appendChild(bigBone);
        $("#boneCloseBtn", currDoc).bind("click",
        function(e) {
            //bigBone.style.top = "-210px";
            $(this).parent().remove();
        });
        $("#boneCloseBtn", currDoc).hover(
        function() {
            this.style.backgroundPosition = "0px -35px";
        },
        function() {
            this.style.backgroundPosition = "0px 0px";
        }
        );
        animatePx = jetpack.tabs.focused.contentWindow.innerHeight + 25;
        $("#bigBone", currDoc).animate({
            marginTop: animatePx + "px"
        },
        500, "swing",
        function() {}
        );
    }
}

function getFactByID(num) {
    for (var i = 0; i < myStorage.myFacts.length; i++) {
        if (myStorage.myFacts[i].id == num) return myStorage.myFacts[i];
    }
    return null;
}

//Drops a meat bone from the top of the screen with a random active fact
function showRandomMeatFact() {
    //immidiately start timer again so facts build up
    currDoc = jetpack.tabs.focused.contentDocument;
    var randomFactNum = myStorage.activeFacts[Math.floor(Math.random() * myStorage.activeFacts.length)];
    currFact = getFactByID(randomFactNum);
    console.log("active facts: " + myStorage.activeFacts + " selected num: " + randomFactNum + " current fact: " + currFact);
    //split up text and underline the keywords for emphasis
    brokenText = currFact.text.split(" ");
    var printText = "";
    var letterCount = 0;
    for (i = 0; i < brokenText.length; i++) {
        var thisWord = brokenText[i];
        var newWord = "";
        if (currFact.keyWords.indexOf(i.toString()) >= 0) {
            thisWord = "<span style=\"text-decoration:underline\">" + thisWord + "</span> ";
        } else {
            thisWord = "<span style=\"text-decoration:none\">" + thisWord + "</span> ";
        }
        printText += thisWord;
        totalLetters = letterCount;
    }
    //if a meat bone has already been added to the document, clone it
    //otherwise add a new meat bone element to the document.
    //
    //NOTE: this may not be the best approach but is a hack that has worked.
    //Should revisit with a more professional opinion
    if ($("#meatBone", currDoc).length > 0) {
        console.log("already a fact on stage");
        animatePx = jetpack.tabs.focused.contentWindow.innerHeight + 25;
        itemWidth = 702;
        randomX1 = Math.floor(Math.random() * (jetpack.tabs.focused.contentWindow.innerWidth - itemWidth));
        $("#meatBone", currDoc).clone(true).insertBefore($("#meatBone:last", currDoc));
        $("#meatBone:first", currDoc).css("margin-top", "0px");
        $("#meatBone:first", currDoc).css("z-index", findHighestZ() + 1);
        $("#meatBone:first", currDoc).css("left", randomX1 + "px");
        $("#meatBoneBoneCopy:first", currDoc).html("<center><span style='" + stylesObj.trollText + "'>" + printText + "</span></center>");
        $("#meatBone:first", currDoc).each(function() {
            var randomNumber = Math.floor(Math.random() * 50) - 25;
            $(this).css("-moz-transform", "rotate(" + randomNumber + "deg)");
        });
        $("#meatBone:first", currDoc).animate({
            marginTop: animatePx + "px"
        },
        500,
        function() {}
        );
    } else {
        meatBoneCopy.innerHTML = "<center><span style='" + stylesObj.trollText + "'>" + printText + "</span></center>";
        meatBone.style.zIndex = findHighestZ() + 1;
        itemWidth = 702;
        randomX1 = Math.floor(Math.random() * (jetpack.tabs.focused.contentWindow.innerWidth - itemWidth));
        meatBone.style.left = randomX1 + "px";
        meatBone.style.marginTop = "0px";
        currDoc.body.appendChild(meatBone);
        $("#meatBoneCloseBtn", currDoc).bind("click",
        function(e) {
            //bigBone.style.top = "-282px";
            $(this).parent().remove();
        });
        $("#meatBoneCloseBtn", currDoc).hover(
        function() {
            this.style.backgroundPosition = "0px -35px";
        },
        function() {
            this.style.backgroundPosition = "0px 0px";
        }
        );
        animatePx = jetpack.tabs.focused.contentWindow.innerHeight + 25;
        $("#meatBone", currDoc).animate({
            marginTop: animatePx + "px"
        },
        500, "swing",
        function() {}
        );
    }
}

//Edit the fact that has been clicked in the slidebar.  The Slidebar
//is also passed in so I can immidiately refresh the contents
//
//NOTE: a lot of the code here is duplicated from the context menu click
//it would be better to break this out into a separate function somehow
function editFact(num, slide) {
    currDoc = jetpack.tabs.focused.contentDocument;
    var doc = jetpack.tabs.focused.contentDocument;
    var win = jetpack.tabs.focused.contentWindow;
    currText = myStorage.myFacts[num].text;
    brokenText = currText.split(" ");
    var printText = "";
    for (i = 0; i < brokenText.length; i++) {
		var openA = "";
        if (myStorage.myFacts[num].keyWords.indexOf(i.toString())<0) openA = "<span style='" + stylesObj.clickableWord + "' class='clickableWord' rel=\"" + i + "\">";
        else openA = "<span style='" + stylesObj.clickedWord + "' class='clickedWord' rel=\"" + i + "\">";
		printText += openA + brokenText[i] + "</span> ";
    }
    printText += "</span>";
    popupContent.innerHTML = "<b><span style='" + stylesObj.trollText + "'><span style='" + stylesObj.popupTitle + "'>Click on the key words:</span></b><p><center>" + printText + "</span></center>";
    currDoc.body.appendChild(bgFade);
    bgFade.style.zIndex = findHighestZ() + 1;
    $("#bgFade", currDoc).animate({
        opacity: "0.8"
    },
    150,
    function() {
        addedWords = [];
        addStylesToPage(jetpack.tabs.focused.contentDocument);
        popup.appendChild(closeBtn);
        popup.appendChild(trollArm);
        popup.style.zIndex = findHighestZ() + 1;
        doc.body.appendChild(popup);
        popup.style.opacity = 100;
        doc.getElementById("popup").appendChild(popupContent);
        $("#trollCloseBtn", doc).bind("click",
        function(e) {
            clearPopup();
        });
        $("#trollCloseBtn", doc).hover(
        function() {
            this.style.backgroundPosition = "0px -35px";
        },
        function() {
            this.style.backgroundPosition = "0px 0px";
        }
        );
        $("#trollArm", doc).hover(
        function() {
            this.style.backgroundPosition = "0px -102px";
        },
        function() {
            this.style.backgroundPosition = "0px 0px";
        }
        );
        $(".clickableWord", doc).bind("click",
        function(e) {
            var thisVal = $(this).attr('rel');
            if (addedWords.indexOf(thisVal) < 0) {
                addedWords.push(thisVal);
                $(this).attr('style', stylesObj.clickedWord);
            } else {
                addedWords.splice(addedWords.indexOf(thisVal));
                $(this).attr('style', stylesObj.clickableWord);
            }
            //$(this).removeClass();
            //$(this).addClass('clickedWord');
        });
        $(".clickableWord", doc).hover(
        function() {
            thisVal = $(this).attr('rel');
            if (addedWords.indexOf(thisVal) < 0) $(this).attr('style', stylesObj.clickableWord_hover);
            else $(this).attr('style', stylesObj.clickedWord_hover);
        },
        function() {
            thisVal = $(this).attr('rel');
            if (addedWords.indexOf(thisVal) < 0) $(this).attr('style', stylesObj.clickableWord);
            else $(this).attr('style', stylesObj.clickedWord);
        }
        );
        $("#trollArm", doc).bind("click",
        function(e) {
            console.log("clickedBtn, words are: " + addedWords.toString());
            saveText();
            smallDisplay("MMMMmmmm!  Good fact!");
            clearPopup();
        });
    });
}

//This is neccessary for each page where troll content is displayed.
//It adds the CSS styles for the art and content to the page as well
//as preloads any art into the browser cache so it will be ready
//when the timer callbacks are fired.
function addStylesToPage(doc) {
    console.log("attempting to add styles to tab and cache graphics");
    //var doc = jetpack.tabs.focused.contentDocument;
    //if test element is not already present, load everything
    if ($("#trollElementsAreAdded", doc).length == 0) {
        var testDiv = doc.createElement("div");
        testDiv.id = "trollElementsAreAdded";
        //preload images
        preload_image_object = doc.createElement("img");
        image_url = [];
        image_url[0] = "http://www.studytroll.com/imgs/cracks.png";
        image_url[1] = "";
        image_url[2] = "http://www.studytroll.com/imgs/popupBG.png";
        image_url[3] = "http://www.studytroll.com/imgs/hintBtn.png";
        image_url[4] = "http://www.studytroll.com/imgs/guessBtn.png";
        image_url[5] = "http://www.studytroll.com/imgs/bigbone.png";
        image_url[6] = "http://www.studytroll.com/imgs/meatBone.png";
        image_url[7] = "http://www.studytroll.com/imgs/troll_animate.gif";
        image_url[8] = "http://www.studytroll.com/imgs/warning.gif";
        image_url[9] = "http://www.studytroll.com/imgs/goatBG.png";
        image_url[9] = "http://www.studytroll.com/imgs/goatClose.png";

        var i = 0;
        for (i = 0; i <= 9; i++) preload_image_object.src = image_url[i];
        doc.body.appendChild(testDiv);
		checkForMicroformats(doc);
        console.log("->Styles added");
    } else {
        console.log("->Elements already added.  Skipping");
    }
    if (MODE == "FIRSTLOAD") stopTimer();
}

function checkForMicroformats(doc) {
	if ($(".StudyTrollFactList", doc).length > 0) 
	{
		smallDisplay("This page contains Study Troll facts.  Click on the icon on the right to import.");
		
		doc.body.appendChild(microBtn);
		$("#microBtn", doc).css("z-index", findHighestZ() + 1);
		$("#microBtn", doc).bind("click",
	    function(e) {
			$("#microBtn", doc).remove();
			$("#microBtn", doc).unbind("click");
			importMicroformat(doc);
        });
		$("#microBtn", doc).hover(
        function() {
            this.style.backgroundPosition = "0px -27px";
        },
        function() {
            this.style.backgroundPosition = "0px 0px";
        }
        );

		$("#StudyTrollImportBtn", doc).bind("click",
	    function(e) {
			importMicroformat(doc);
        });
		$("#StudyTrollImportBtn", doc).hover(
        function() {
            this.style.backgroundColor = "rgb(180,180,255)";
        },
        function() {
            this.style.backgroundColor = "rgb(120,120,255)";
        }
        );

	} else {
		
	}
}

//removes the popop
function clearPopup() {
    var doc = jetpack.tabs.focused.contentDocument;
    try {
        $("#trollArm", doc).css("background-position", "0px -102px");
        $("#trollArm", doc).animate({
            marginLeft: "1450px"
        },
        250,
        function() {
            });
        $("#popup", doc).animate({
            marginLeft: "1200px"
        },
        250,
        function() {
            $("#bgFade", doc).remove();
            $("#popup", doc).css("margin-left", "-325px");
            $("#popup", doc).css("z-index", "-1");
            $("#popup", doc).css("opacity", "0");
            $("#trollArm", doc).css("background-position", "0px 0px");
            $("#trollArm", doc).css("margin-left", "250px");
        });
    } catch(err) {
        $("#popup", doc).css("margin-left", "-325px");
        $("#popup", doc).css("z-index", "-1");
        $("#popup", doc).css("opacity", "0");
        $("#trollArm", doc).css("background-position", "0px 0px");
        $("#trollArm", doc).css("margin-left", "250px");
    } finally {}
}

//adds the selected/edited text to the user's Jetpack storage
function saveText() {
    thisID = myStorage.myFacts.length;
    myStorage.myFacts.push({
        text: currText,
        keyWords: addedWords,
        right: 0,
        wrong: 0,
        source: jetpack.tabs.focused.contentWindow.location.href,
        active: 1,
        id: thisID
    });
    myStorage.activeFacts.push(thisID);
}

function importMicroformat(doc) {
	//traverse page, convert facts to array
	//importData with array
	//$("#testArea", doc).html("...working");
	var newData = [];
	if ($(".StudyTrollFactList", doc).length > 0) {
		$(".StudyTrollFact", doc).each(
			function() {
				keywordStringList = $(this).attr("blankNums").split(",");
				newData.push({text:$(this).text(), keyWords:keywordStringList, right:0, wrong:0, source:$(this).attr("url"), active:1, id:myStorage.myFacts.length+newData.length});
			}
			);
	}
	//$("#testArea", doc).html("adding:"+newData[1].text+" "+newData[1].keyWords+" "+newData[1].source);
	importData(true, newData);
}

//event.preventDefault

function quizletListAvailable(document){
	thisURL = jetpack.tabs.focused.contentWindow.location.href;
	if (pageModCurrent==thisURL||thisURL.match(/\d+(?=\/)/g)==null) {
		return;
	} 
	pageModCurrent=thisURL;
	smallDisplay("This page contains facts that can be imported to Study Troll.  Click the icon to the right to import.");
	doc = jetpack.tabs.focused.contentDocument;
    doc.body.appendChild(microBtn);
	$("#microBtn", doc).css("z-index", findHighestZ() + 1);
	$("#microBtn", doc).bind("click",
    function(e) {
		$("#microBtn", doc).unbind("click");
		$("#microBtn", doc).remove();
		importJSON(jetpack.tabs.focused.contentWindow.location.href);
    });
	$("#microBtn", doc).hover(
    function() {
        this.style.backgroundPosition = "0px -27px";
    },
    function() {
        this.style.backgroundPosition = "0px 0px";
    }
    );
}

function importJSON(thisURL) {
	var match = thisURL.match(/\d+(?=\/)/g);
	//below uses this projects personal API key for quizlet.  please do not copy.
	$.get('http://quizlet.com/api/1.0/sets?dev_key=5ebwdpi53f0o8ssc&q=ids:'+match[0]+'&extended=on', function(jsonString) {
		jsObject = JSON.parse(jsonString);
		var newData = [];
		for (i=0; i<jsObject.sets[0].term_count;i++) {
			thisText = jsObject.sets[0].terms[i][1] + ": " + jsObject.sets[0].terms[i][0];
			keywordArray = [];
			wordCount1 = (jsObject.sets[0].terms[i][1].split(" ")).length;
			wordCount2 = (jsObject.sets[0].terms[i][0].split(" ")).length;
			for (j=wordCount1;j<=wordCount1+wordCount2;j++) {
				keywordArray.push(j.toString());
			}
			newData.push({text:thisText, keyWords:keywordArray, right:0, wrong:0, source:thisURL, active:1, id:myStorage.myFacts.length+newData.length});	
		}
		importData(true, newData);
	});
}

function importData(eraseAll, factList) {
	if (eraseAll) {
		myStorage.myFacts = [];
		myStorage.activeFacts = [];
	}
	for (i=0; i<factList.length; i++) {
		myStorage.myFacts.push({
	        text: factList[i].text,
	        keyWords: factList[i].keyWords,
	        right: 0,
	        wrong: 0,
	        source: factList[i].source,
	        active: 1,
	        id: factList[i].id
	    });
	    myStorage.activeFacts.push(factList[i].id);
	}
	smallDisplay(factList.length.toString()+" facts imported.");
}

function exportData() {
	exportString = "<div class='StudyTrollFactList' copyprotect='true'>";
	exportString += "<br>";
	exportString += "<table cellspacing='0' cellpadding='3' style='font-family:arial,helvetica,geneva,swiss;font-size:10pt' border='1px solid'>";
	exportString += "	<tbody>";
	exportString += "		<tr>";
	exportString += "			<td id='StudyTrollImportBtn' align='center' style='background-color:rgb(120,120,255);cursor:pointer'>";
	exportString += "				<span>";
	exportString += "					Click HERE to import these facts.";
	exportString += "				</span>";
	exportString += "			</td>";
	exportString += "		</tr>";
	for (i=0; i<myStorage.myFacts.length;i++) {
		blankNumList = myStorage.myFacts[i].keyWords[0].toString();
		for (j=1;j<myStorage.myFacts[i].keyWords.length;j++) {
			blankNumList += ","+myStorage.myFacts[i].keyWords[j].toString();
		}
		brokenText = myStorage.myFacts[i].text.split(" ");
		printText = "";
		for (k=0;k<brokenText.length;k++) {
			if (myStorage.myFacts[i].keyWords.indexOf(k.toString())>=0) printText += " <span style='text-decoration:underline'>"+ brokenText[k] + "</span>"
			else printText += " " + brokenText[k];
		}
		exportString += "		<tr>";
		exportString += "			<td align='center'>";
		exportString += "				<span class='StudyTrollFact' blanknums='"+blankNumList+"' url='"+myStorage.myFacts[i].source+"'>"+printText+"</span>";
		exportString += "			</td>";
		exportString += "		</tr>";
	}	
	exportString += "	</tbody>";
	exportString += "</table>";
	exportString += "</div>";
	copyString = "<br><div id='studyTrollExportedCopyText' style='text-decoration:underline;color:blue;cursor:pointer;font-size:10pt'>CLICK HERE TO COPY THIS HTML TO CLIPBOARD</div>";
	escapedHeader = 'data:text/html;charset=utf-8,<!DOCTYPE HTML PUBLIC "-%2F%2FW3C%2F%2FDTD HTML 4.0%2F%2FEN">%0D%0A<html lang%3D"en">%0D%0A <head>%0D%0A  <title>Test<%2Ftitle>%0D%0A  <style type%3D"text%2Fcss">%0D%0A  <%2Fstyle>%0D%0A <%2Fhead>%0D%0A <body>%0D%0A';
	escapedFooter = "<%2Fbody>%0D%0A<%2Fhtml>%0D%0A";
	var tb = jetpack.tabs.open(escapedHeader+exportString+copyString+escapedFooter);
    tb.focus();
	jetpack.tabs.onReady(function (tab) {
		$("#studyTrollExportedCopyText", tab).click(function(e) {
			smallDisplay("HTML copied to clipboard.")
			jetpack.clipboard.set(exportString);
		});
	});
}


//Starts the Troll.  Facts will begin to fall at the set interval until the Troll is ready to appear
function startTimer() {
    try {
        clearTimeout(trollTimer);
        clearTimeout(warningTimer);
        clearTimeout(reminderTimer);
    } catch(err) {}
	if (debugMode) {
		console.log("debug mode active");
		reminderEnabled = true;
		smallDisplay("DEMO MODE IS ACTIVE.");
		trollTimer = setTimeout(readyTroll, 20000);
	    reminderTimer = setTimeout(showRandomFact, 2000);
	} else {
		if (trollEnabled) trollTimer = setTimeout(readyTroll, trollTimerLength);
	    if (reminderEnabled) reminderTimer = setTimeout(showRandomFact, reminderTimerLength);
	}
    console.log("timer started");
    MODE = "ON";
    $("#statusbar", myStatusObj).html("<img src='http://www.studytroll.com/imgs/on.gif' alt='StudyTroll:ON' title='Quizzing is ON'>");
}

//While the Troll is on, this is fired at a set interval to display a reminder of the stored facts
//It will randomly choose between the (currently two) different art assets to use to display the fact
function showRandomFact() {
    addStylesToPage(jetpack.tabs.focused.contentDocument);
	initFactList();
	if (debugMode && MODE!="OFF") {
		reminderTimer = setTimeout(showRandomFact, 7500);
	} else if (MODE!="OFF") {
		reminderTimer = setTimeout(showRandomFact, reminderTimerLength);
	}
    if (Math.random() > 0.5) showRandomMeatFact();
    else showRandomBoneFact();
}

//Turns the troll off.  All Timers are stopped and no browsing experience is altered.
function stopTimer() {
    clearTimeout(trollTimer);
    clearTimeout(warningTimer);
    clearTimeout(reminderTimer);
    MODE = "OFF";
    $("#statusbar", myStatusObj).html("<img src='http://www.studytroll.com/imgs/off.png' alt='StudyTroll:OFF' title='Quizzing is OFF'>");
}

//Called 6 seconds before the Troll will appear.  If there are active facts the statusbar will go into warning mode
//and prepare to drop the Troll for a quiz.  The user has 6 seconds to cancel (which sends the troll back to ON mode)
function readyTroll() {
    if (myStorage.activeFacts.length > 0) {
        addStylesToPage(jetpack.tabs.focused.contentDocument);
        MODE = "WARNING";
        clearTimeout(reminderTimer);
        console.log("warning started");
        //To prevent the animated GIF from cacheing (and thus not starting at frame 1 each time)
        //the image is loaded with a different random query number each time.
        var rndNum = Math.floor(Math.random() * 1000000);
        $("#statusbar", myStatusObj).html("<img src='http://www.studytroll.com/imgs/warning.gif?" + rndNum + "'  title='The Troll is coming!'");
        warningTimer = setTimeout(activateTroll, warningTimerLength);
    }
}

//The troll is activated:
function activateTroll() {
    quizActive = true;
    //The styles must be added at this point in case the user switched tabs/windows
    addStylesToPage(jetpack.tabs.focused.contentDocument);
    $("#statusbar", myStatusObj).html("<img src='http://www.studytroll.com/imgs/warningOver.png' alt='StudyTroll:QUIZ' title='Quizzing is ON'>");
    MODE = "ON";
    //Previous counts are reset
    currLetter = 0;
    currWord = 0;
    totalLetters = 0;
    hintCount = 0;
    guessBtn.style.backgroundPosition = "0px -53px";
    hintBtn.style.backgroundPosition = "0px 0px";
    currDoc = jetpack.tabs.focused.contentDocument;
    //Remove any reminders (bones) in the window to prevent cheating
    while ($("#bigBone", currDoc).length > 0) $("#bigBone", currDoc).remove();
    while ($("#meatBone", currDoc).length > 0) $("#meatBone", currDoc).remove();
    //Block copy and paste by blocking access to context menu and clearing the clipboard on all keyup (to prevent CTRL+C)
    if (useCopyProtection) {
        $(currDoc).bind("contextmenu",
        function(e) {
            return false;
        });
        $(currDoc).keyup(
        function() {
            jetpack.clipboard.set("");
        });
    }
    var randomFactNum = myStorage.activeFacts[Math.floor(Math.random() * myStorage.activeFacts.length)];
    currFact = getFactByID(randomFactNum);
    brokenText = currFact.text.split(" ");
    var printText = "";
    var letterCount = 0;
    correctLetters = "";
    for (i = 0; i < brokenText.length; i++) {
        var thisWord = brokenText[i];
        var newWord = "";
        if (currFact.keyWords.indexOf(i.toString()) >= 0) {
            var matches = /\W/g;
            for (j = 0; j < thisWord.length; j++) {
                var result = matches.test(thisWord.charAt(j));
                if (!result) {
                    newWord += "<span id='trollLetter' num='" + letterCount + "' numInWord='" + j + "' class='emptyBlank' style='" + stylesObj.emptyBlank + "'>" + blankChar + "</span>";
                    letterCount++;
                    correctLetters += thisWord.charAt(j);
                } else {
                    newWord += thisWord.charAt(j);
                }
            }
            thisWord = "<span id='trollWord' num='" + currFact.keyWords.indexOf(i.toString()) + "'>" + newWord + "</span> ";
        } else {
            thisWord += " ";
        }
        printText += thisWord;
        totalLetters = letterCount;
    }
console.log(printText);
    trollSignContents.innerHTML = "<center><center><table height=\"230\" style='background-color:rgb(222,201,179);'><tbody><tr><td align=\"center\" valign=\"middle\"><span style='" + stylesObj.trollText + "'>" + printText + "</span></td></tr></tbody></table></center></center>";
    viewportwidth = jetpack.tabs.focused.contentWindow.innerWidth;
    viewportheight = jetpack.tabs.focused.contentWindow.innerHeight;
    animatePx = viewportheight - 595;
    currDoc.body.appendChild(bgFade);
    bgFade.style.zIndex = findHighestZ() + 1;
    $("#bgFade", currDoc).animate({
        opacity: "0.8"
    },
    250,
    function() {
        //Add troll DIV contents, buttons, and animate him down to the bottom of the window
        trollDrop.appendChild(trollSignContents);
        trollDrop.style.zIndex = findHighestZ() + 1;
        trollDrop.style.opacity = 100;
        currDoc.body.appendChild(trollDrop);
        $("#trollSignContents", currDoc).css("-moz-transform", "rotate(5deg)");
        $("#guessBtn", currDoc).hover(
        function() {
            this.style.backgroundPosition = "0px 0px";
        },
        function() {
            this.style.backgroundPosition = "0px -53px";
        }
        );
        $("#hintBtn", currDoc).hover(
        function() {
            if (hintCount <= maxHints) this.style.backgroundPosition = "0px -53px";
            else this.style.backgroundPosition = "0px -159px";
        },
        function() {
            if (hintCount <= maxHints) this.style.backgroundPosition = "0px 0px";
            else this.style.backgroundPosition = "0px -106px";
        }
        );
        $("#troll", currDoc).animate({
            marginTop: animatePx + "px"
        },
        500, beginQuiz);
    });
}

//When the Troll dropping animation is complete.  Shake page, add cracks, mess up images, and activate quiz elements
function beginQuiz() {
	jetpack.tabs.onClose(function(tab) {
		endQuiz();
	})
    //Shake page
    vibrate();
    //Add cracks
    cracksR.style.zIndex = parseInt($("#troll", currDoc).attr('z-index')) - 1;
    cracksL.style.zIndex = parseInt($("#troll", currDoc).attr('z-index')) - 1;
    currDoc.body.appendChild(cracksR);
    currDoc.body.appendChild(cracksL);
    //Add keyboard listeners
    $(currDoc).keypress(checkKey);
    $("span[id=trollLetter][num=" + currLetter + "]", currDoc).removeClass();
    $("span[id=trollLetter][num=" + currLetter + "]", currDoc).addClass('selectedBlank');
    $("span[id=trollLetter][num=" + currLetter + "]", currDoc).html('<blink>'+blankChar+'</blink>');
    $("span[id=trollLetter][num=" + currLetter + "]", currDoc).attr('style', stylesObj.selectedBlank);
    //Set button listeners
    $("#guessBtn", currDoc).bind("click", testCorrect);
    $("#hintBtn", currDoc).bind("click",
    function(e) {
        if (hintCount <= maxHints) {
            console.log("hint btn");
            var testString = "";
            $("span[id=trollLetter]", currDoc).each(function() {
                if ($(this).attr('numInWord') == hintCount) {
                    $(this).text(correctLetters.charAt(parseInt($(this).attr('num'))));
                    $(this).removeClass();
                    $(this).addClass('hintBlank');
                    $(this).attr('style', stylesObj.hintBlank);
                    if ($(this).attr('num') == currLetter) editNextChar();
                }
            });
            hintCount++;
            if (hintCount > maxHints) hintBtn.style.backgroundPosition = "0px -106px";
        }
        else {
            console.log("hints maxed out");
            endQuiz();
            var tb = jetpack.tabs.open(currFact.source);
            tb.focus();

        }
		$("span[id=trollLetter][num=1]", currDoc).trigger("focus");
		
    });
}

//Small custom UI to display bits of information at the top of the window
function smallDisplay(copy) {
    currDoc = jetpack.tabs.focused.contentDocument;
    currDoc.body.appendChild(smallPopup);
    smallPopup.style.width = jetpack.tabs.focused.contentWindow.innerWidth + "px";
	zVal = findHighestZ() + 1;
    smallPopup.style.zIndex = zVal;
    $("#smallPopup", currDoc).html("<span style='" + stylesObj.smallDisplayText + "'><center>" + copy + "</center></span>");
    $("#smallPopup", currDoc).animate({
        opacity: "100"
    },
    6000,
    function() {
        $("#smallPopup", currDoc).animate({
            opacity: "0"
        },
        1000
        );
    });
}

//End the quiz
function endQuiz() {
    //remove listeners and copy protection
    $(currDoc).unbind("keypress");
    $(currDoc).unbind("keyup");
    $(currDoc).unbind("contextmenu");
    $("#guessBtn", currDoc).unbind("click");
    $("#hintBtn", currDoc).unbind("click");
    $(jetpack.tabs.focused.contentDocument).unbind("mousedown");
	$(jetpack.tabs.focused.contentDocument).unbind("onClose");
    //remove and reset troll
    trollDrop.removeChild(trollSignContents);
    trollDrop.style.zIndex = -1;
    trollDrop.style.opacity = 0;
    currDoc.body.removeChild(trollDrop);
    currDoc.body.removeChild(bgFade);
    bgFade.style.zIndex = -1;
    trollDrop.style.marginTop = "-500px";
    //return page to normal
    resetImages();
    //restart the timer
    startTimer();
    quizActive = false;
}

//Keyboard listener
function checkKey(e) {
    switch (e.keyCode) {
    case 37:
        //LEFT
		e.preventDefault();
        editPrevChar(false);
        break;
    case 39:
        //RIGHT
		e.preventDefault();
        editNextChar();
        break;
    case 46:
        //DELETE
		e.preventDefault();
        editPrevChar(true);
        break;
    case 8:
        //BACKSPACE
		e.preventDefault();
        editPrevChar(true);
        break;
    case 13:
        //ENTER
		e.preventDefault();
        testCorrect();
        break;
	case 27:
		//esacape
		e.preventDefault();
    default:
        //ALL OTHER CHARACTERS USE AS INPUT
        makeChar(String.fromCharCode(e.which));
    }
}

//Check if entered guess matches the correct response and end quiz if it does
function testCorrect() {
    var testString = "";
    $("span[id=trollLetter]", currDoc).each(function() {
        testString += $(this).text();
    });
    if (correctLetters.toUpperCase() == testString.toUpperCase()) {
        console.log("correct");
        currFact.right++;
        smallDisplay("You got it!");
        endQuiz();
    } else {
        console.log("wrong");
        currFact.wrong++;
        smallDisplay("Nope! Try again.");
    }
}

//Move editable character forward one
function editNextChar() {
    if ($("span[id=trollLetter][num=" + currLetter + "]", currDoc).attr('class') != "hintBlank") {
        $("span[id=trollLetter][num=" + currLetter + "]", currDoc).attr('style', stylesObj.emptyBlank);
        $("span[id=trollLetter][num=" + currLetter + "]", currDoc).removeClass();
        $("span[id=trollLetter][num=" + currLetter + "]", currDoc).addClass('emptyBlank');
		$("span[id=trollLetter][num=" + currLetter + "]", currDoc).html($("span[id=trollLetter][num=" + currLetter + "]", currDoc).text());
    }
    if (currLetter >= totalLetters - 1) {
        currLetter = 0;
    } else {
        currLetter++;
    }
    if ($("span[id=trollLetter][num=" + currLetter + "]", currDoc).attr('class') != "hintBlank") {
        $("span[id=trollLetter][num=" + currLetter + "]", currDoc).attr('style', stylesObj.selectedBlank);
        $("span[id=trollLetter][num=" + currLetter + "]", currDoc).removeClass();
        $("span[id=trollLetter][num=" + currLetter + "]", currDoc).addClass('selectedBlank');
		$("span[id=trollLetter][num=" + currLetter + "]", currDoc).html('<blink>'+$("span[id=trollLetter][num=" + currLetter + "]", currDoc).text()+'</blink>');
    } else {
        editNextChar()
    }
}

//Move editable character placement backwards one
//if deleteChar is true, the previous character is CLEARED
//as well.  This is used for DELETE and BACKSPACE keys
function editPrevChar(deleteChar) {
    if ($("span[id=trollLetter][num=" + currLetter + "]", currDoc).attr('class') != "hintBlank") {
        $("span[id=trollLetter][num=" + currLetter + "]", currDoc).attr('style', stylesObj.emptyBlank);
        $("span[id=trollLetter][num=" + currLetter + "]", currDoc).removeClass();
        $("span[id=trollLetter][num=" + currLetter + "]", currDoc).addClass('emptyBlank');
		$("span[id=trollLetter][num=" + currLetter + "]", currDoc).html($("span[id=trollLetter][num=" + currLetter + "]", currDoc).text());
    }
    if (currLetter == 0) {
        currLetter = totalLetters;
    } else {
        currLetter--;
    }
    if ($("span[id=trollLetter][num=" + currLetter + "]", currDoc).attr('class') != "hintBlank") {
        $("span[id=trollLetter][num=" + currLetter + "]", currDoc).attr('style', stylesObj.selectedBlank);
        $("span[id=trollLetter][num=" + currLetter + "]", currDoc).removeClass();
        $("span[id=trollLetter][num=" + currLetter + "]", currDoc).addClass('selectedBlank');
        if (deleteChar) $("span[id=trollLetter][num=" + currLetter + "]", currDoc).html('<blink>'+blankChar+'</blink>');
		else $("span[id=trollLetter][num=" + currLetter + "]", currDoc).html('<blink>'+$("span[id=trollLetter][num=" + currLetter + "]", currDoc).text()+'</blink>');
    } else {
        editPrevChar(false);
    }
}

//Sets the current blank to the character entered on the keyboard
function makeChar(ch) {
    if ($("span[id=trollLetter][num=" + currLetter + "]", currDoc).attr('class') != "hintBlank") {
        $("span[id=trollLetter][num=" + currLetter + "]", currDoc).attr('style', stylesObj.usedBlank);
        $("span[id=trollLetter][num=" + currLetter + "]", currDoc).removeClass();
        $("span[id=trollLetter][num=" + currLetter + "]", currDoc).addClass('usedBlank');
        $("span[id=trollLetter][num=" + currLetter + "]", currDoc).text(ch);
        editNextChar();
    }
}

//Randomly rotates all the images on the page to create the effect of the troll 'hitting the ground'
var imageRotations = [];
function rotateImages() {
    imageRotations = [];
    var win = jetpack.tabs.focused.contentWindow;
    var doc = jetpack.tabs.focused.contentDocument;
    $(doc).find("img").each(function() {
        //if contains a rotations, store it, mark its number for later
        try {
            imgRot = $(this).css("-moz-transform");
            if (imgRot != "none") {
                console.log("foung img with transform. saving value");
                imageRotations.push(imgRot);
                $(this).attr("trollRotationValIdx", imageRotations.length)
            }
        } catch(err) {

            }
        var randomNumber = Math.floor(Math.random() * 30) - 15;
        $(this).css("-moz-transform", "rotate(" + randomNumber + "deg)");
    });
    $(doc).find("*:header").each(function() {
        var randomNumber = Math.floor(Math.random() * 8) - 4;
        $(this).css("-moz-transform", "rotate(" + randomNumber + "deg)");
    });

}

//Returns all images on the page to normal rotation and removes the cracks
//NOTE: If any images on the page were set by the web designer to have
//rotation this will REMOVE that as well.  A fix needs to be implented to
//record which images have prior rotation and return them to their default here.
function resetImages() {
    var win = jetpack.tabs.focused.contentWindow;
    var doc = jetpack.tabs.focused.contentDocument;
    $(doc).find("img").each(function() {
        try {
            if ($(this).attr("trollRotationValIdx") != "none") {
                console.log("restoring original rotation, " + $(this).attr("trollRotationValIdx"));
                $(this).css("-moz-transform", imageRotations[trollRotationValIdx]);
            }
        } catch(err) {}
        $(this).css("-moz-transform", "rotate(0deg)");
    });
    $(doc).find("*:header").each(function() {
        $(this).css("-moz-transform", "rotate(0deg)");
    });
    currDoc.body.removeChild(cracksR);
    currDoc.body.removeChild(cracksL);
}

//Shake the 'body' of the page
function vibrate() {
    /*
    * Based on Vibrate 1.0 
    * Copyright (c) 2008 Andreas Lagerkvist (andreaslagerkvist.com)
    * Released under a GNU General Public License v3 (http://creativecommons.org/licenses/by/3.0/)
    */
    var doc = jetpack.tabs.focused.contentDocument;
    $(doc).find("body").each(function() {

        var conf = {
            frequency: 5000,
            spread: 25,
            duration: 400,
            speed: 30
        };

        var t = $(this);

        var vibrate = function() {
            var topPos = Math.floor(Math.random() * conf.spread) - ((conf.spread - 1) / 2);
            var leftPos = Math.floor(Math.random() * conf.spread) - ((conf.spread - 1) / 2);
            t.css({
                position: 'relative',
                left: leftPos + 'px',
                top: topPos + 'px'
            });

        };

        var doVibration = function() {

            var vibrationInterval = setInterval(vibrate, conf.speed);

            var stopVibration = function() {
                clearInterval(vibrationInterval);
                t.css({
                    position: 'static'
                });
            };

            setTimeout(stopVibration, conf.duration);
        };

        doVibration();

    });
    setTimeout(rotateImages, 400);
};

//Find the highest z-index on the page and return it
function findHighestZ() {
    doc = jetpack.tabs.focused.contentDocument;
    var elems = doc.getElementsByTagName('*');
    var highest = 0;
    for (var i = 0; i < elems.length; i++)
    {
        var zindex = doc.defaultView.getComputedStyle(elems[i], null).getPropertyValue("z-index");
        if ((zindex > highest) && (zindex != 'auto'))
        {
            highest = zindex;
        }
    }
    console.log("highest z is " + highest);
    return parseInt(highest);
}

//Set Context Menu
jetpack.menu.context.page.add(new jetpack.Menu({
    type: "separator"
}));

jetpack.menu.context.page.add(
{
    label: "FEED to Troll",
    icon: "http://www.studytroll.com/imgs/troll_ico.png",
    command: function(menuitem) {
        jetpack.tabs.onReady(addStylesToPage);
        currDoc = jetpack.tabs.focused.contentDocument;
        var doc = jetpack.tabs.focused.contentDocument;
        var win = jetpack.tabs.focused.contentWindow;
        currText = win.getSelection().toString();
		if (currText.length > maxChars) {
			currText = currText.slice(0, maxChars);
			currText += "...";
		}
        brokenText = currText.split(" ");
		if (brokenText.length<2) {
			smallDisplay("This fact is too short.  Highlight at least 3 words.");
			return;
		}
        var printText = "";
        for (i = 0; i < brokenText.length; i++) {
            var openA = "<span style='" + stylesObj.clickableWord + "' class='clickableWord' rel=\"" + i + "\">";
            printText += openA + brokenText[i] + "</span> ";
        }
        printText += "</span>";
        popupContent.innerHTML = "<b><span style='" + stylesObj.popupTitle + "'>Click on the key words:</span></b><p><center>" + printText + "</center>";
        currDoc.body.appendChild(bgFade);
        bgFade.style.zIndex = findHighestZ() + 1;
        $("#bgFade", currDoc).animate({
            opacity: "0.8"
        },
        150,
        function() {
            addStylesToPage(jetpack.tabs.focused.contentDocument);
            addedWords = [];
            popup.appendChild(closeBtn);
            popup.appendChild(trollArm);
            popup.style.zIndex = findHighestZ() + 1;
            doc.body.appendChild(popup);
			if (currText.length > maxChars) {
				smallDisplay("Your fact has been shortened to " + maxChars + " characters.");
			}
            popup.style.opacity = 100;
            doc.getElementById("popup").appendChild(popupContent);
            $("#trollCloseBtn", doc).bind("click",
            function(e) {
                clearPopup();
            });
            $("#trollCloseBtn", doc).hover(
            function() {
                this.style.backgroundPosition = "0px -35px";
            },
            function() {
                this.style.backgroundPosition = "0px 0px";
            }
            );
            $("#trollArm", doc).hover(
            function() {
                this.style.backgroundPosition = "0px -102px";
            },
            function() {
                this.style.backgroundPosition = "0px 0px";
            }
            );
            $(".clickableWord", doc).bind("click",
            function(e) {
                var thisVal = $(this).attr('rel');
                if (addedWords.indexOf(thisVal) < 0) {
                    addedWords.push(thisVal);
                    $(this).attr('style', stylesObj.clickedWord);
                } else {
                    addedWords.splice(addedWords.indexOf(thisVal));
                    $(this).attr('style', stylesObj.clickableWord);
                }
                //$(this).removeClass();
                //$(this).addClass('clickedWord');
                console.log("added word " + brokenText[thisVal]);
            });
            $(".clickableWord", doc).hover(
            function() {
                var thisVal = $(this).attr('rel');
                if (addedWords.indexOf(thisVal) < 0) $(this).attr('style', stylesObj.clickableWord_hover);
                else $(this).attr('style', stylesObj.clickedWord_hover);
            },
            function() {
                var thisVal = $(this).attr('rel');
                if (addedWords.indexOf(thisVal) < 0) $(this).attr('style', stylesObj.clickableWord);
                else $(this).attr('style', stylesObj.clickedWord);
            }
            );
            $("#trollArm", doc).bind("click",
            function(e) {
                console.log("clickedBtn, words are: " + addedWords.toString());
                saveText();
                smallDisplay("MMMMmmmm!  Good fact!");
                clearPopup();
            });
        });
    }
});

//End of code

//
//    Styles and Elements that are added to the page:
//

var styles = currDoc.createElement("style");

//inline styles:
var stylesObj = {};
stylesObj.popupTitle = "font-family:arial,helvetica,geneva,swiss;color:black;text-align:left;font-size:10pt !important";
stylesObj.clickableWord = "font-family:arial,helvetica,geneva,swiss;cursor:pointer;color:black;font-size:11pt !important";
stylesObj.clickableWord_hover = "font-family:arial,helvetica,geneva,swiss;cursor:pointer;color:blue;font-size:11pt !important";
stylesObj.clickedWord = "font-family:arial,helvetica,geneva,swiss;color:#C5C5C5;text-decoration:underline;cursor:pointer;font-size:11pt !important";
stylesObj.clickedWord_hover = "font-family:arial,helvetica,geneva,swiss;color:#B4B4B4;text-decoration:underline;cursor:pointer;font-size:11pt !important";
stylesObj.normal = "font-family:arial,helvetica,geneva,swiss;color:black !important;font-size:12pt !important";
stylesObj.emptyBlank = "font-family:arial,helvetica,geneva,swiss;color:green !important;font-size:12pt !important;font-weight:bold";
stylesObj.usedBlank = "font-family:arial,helvetica,geneva,swiss;color:green !important;font-size:12pt !important;font-weight:bold";
stylesObj.selectedBlank = "font-family:arial,helvetica,geneva,swiss;color:blue !important;font-weight:bold;font-size:12pt !important";
stylesObj.hintBlank = "font-family:arial,helvetica,geneva,swiss;color:black !important;font-size:12pt !important;text-decoration:underline;font-weight:bold";
stylesObj.trollCloseBtn = "cursor:pointer;height:24px;width:24px";
stylesObj.trollArm = "cursor:pointer";
stylesObj.trollSignContents = "-moz-transform:rotate(5deg);font-family:arial,helvetica,geneva,swiss;color:black !important;font-size:12pt !important"
stylesObj.trollText = "font-family:arial,helvetica,geneva,swiss;color:black !important;text-align:left;font-size:12pt !important";
stylesObj.smallDisplayText = "font-family:arial,helvetica,geneva,swiss;font-size:12pt !important";

var guessBtn = currDoc.createElement("div");
guessBtn.id = "guessBtn";
guessBtn.style.background = "url(http://www.studytroll.com/imgs/guessBtn.png)";
guessBtn.style.width = "138px";
guessBtn.style.height = "53px";
guessBtn.style.position = "absolute";
guessBtn.style.bottom = "210px";
guessBtn.style.left = "680px";
guessBtn.style.backgroundPosition = "0px -53px";

var hintBtn = currDoc.createElement("div");
hintBtn.id = "hintBtn";
hintBtn.style.background = "url(http://www.studytroll.com/imgs/hintBtn.png)";
hintBtn.style.width = "138px";
hintBtn.style.height = "53px";
hintBtn.style.position = "absolute";
hintBtn.style.bottom = "556px";
hintBtn.style.left = "680px";
hintBtn.style.backgroundPosition = "0px 0px";

var popup = currDoc.createElement("div");
popup.id = "popup";
popup.style.background = "url(http://www.studytroll.com/imgs/goatBG.png)";
popup.style.position = "fixed";
popup.style.left = "50%";
popup.style.top = "50%";
popup.style.zIndex = "400";
popup.style.height = "413px";
popup.style.width = "750px";
popup.style.marginLeft = "-325px";
popup.style.marginTop = "-206px";

var popupContent = currDoc.createElement("div");
popupContent.id = "popupContent";
popupContent.style.backgroundColor = "#DBDBDB";
popupContent.style.fontVariant = "small-caps";
popupContent.style.position = "relative";
popupContent.style.left = "185px";
popupContent.style.top = "160px";
popupContent.style.width = "450px";

var smallPopup = currDoc.createElement("div");
smallPopup.id = "smallPopup";
smallPopup.style.position = "fixed";
smallPopup.style.color = "rgb(255,255,255)";
smallPopup.style.backgroundColor = "rgba(0,0,0,.7)";
smallPopup.style.border = "2px solid rgba(255,255,255,.3)";
smallPopup.style.height = "20px";
smallPopup.style.width = "1500px";
smallPopup.style.left = "0px";
smallPopup.style.top = "0px";
smallPopup.style.fontSize = "20px";
smallPopup.style.padding = "5px";
smallPopup.style.fontVariant = "small-caps";

var closeBtn = currDoc.createElement("div");
closeBtn.id = "trollCloseBtn";
closeBtn.style.background = "url(http://www.studytroll.com/imgs/closeBtn.png) no-repeat 0 0";
closeBtn.style.position = "relative";
closeBtn.style.left = "660px";
closeBtn.style.top = "120px";
closeBtn.style.height = "35px";
closeBtn.style.width = "36px";
closeBtn.style.display = "block";

var trollDrop = currDoc.createElement("div");
trollDrop.id = "troll";
trollDrop.style.background = "url(http://www.studytroll.com/imgs/troll_animate.gif)";
trollDrop.style.position = "fixed";
trollDrop.style.left = "80px";
trollDrop.style.top = "0px";
trollDrop.style.zIndex = "500";
trollDrop.style.height = "600px";
trollDrop.style.width = "800px";
trollDrop.style.marginTop = "-500px";
trollDrop.appendChild(guessBtn);
trollDrop.appendChild(hintBtn);

var trollSignContents = currDoc.createElement("div");
trollSignContents.id = "trollSignContents";
trollSignContents.style.position = "relative";
trollSignContents.style.left = "327px";
trollSignContents.style.top = "36px";
trollSignContents.style.height = "247px";
trollSignContents.style.width = "366px";
trollSignContents.style.backgroundColor = "rgba(255,255,255,.6)";
trollSignContents.style.fontVariant = "small-caps";
trollSignContents.style.fontFamily = "arial,helvetica,geneva,swiss";
trollSignContents.style.fontSize = "12pts !important";

var bgFade = currDoc.createElement("div");
bgFade.id = "bgFade";
bgFade.style.position = "fixed";
bgFade.style.background = "white";
bgFade.style.zIndex = "499";
bgFade.style.opacity = "0";
bgFade.style.left = "0px";
bgFade.style.top = "0px";
bgFade.style.height = "2500px";
bgFade.style.width = "2500px";

var cracksL = currDoc.createElement("div");
cracksL.id = "cracksL";
cracksL.style.background = "url(http://www.studytroll.com/imgs/cracks.png)";
cracksL.style.position = "absolute";
cracksL.style.left = "0px";
cracksL.style.top = "0px";
cracksL.style.zIndex = "500";
cracksL.style.height = "1024px";
cracksL.style.width = "320px";
cracksL.style.opacity = "0.5";
cracksL.style.backgroundPosition = "0px 0px";

var cracksR = currDoc.createElement("div");
cracksR.id = "cracksR";
cracksR.style.background = "url(http://www.studytroll.com/imgs/cracks.png)";
cracksR.style.position = "absolute";
cracksR.style.right = "0px";
cracksR.style.top = "0px";
cracksR.style.zIndex = "500";
cracksR.style.height = "1024px";
cracksR.style.width = "320px";
cracksR.style.opacity = "0.5";
cracksR.style.backgroundPosition = "-320px 0px";

var bigBone = currDoc.createElement("div");
bigBone.id = "bigBone";
bigBone.style.background = "url(http://www.studytroll.com/imgs/bigbone.png)";
bigBone.style.position = "fixed";
bigBone.style.right = "80px";
bigBone.style.top = "-210px";
bigBone.style.zIndex = "600";
bigBone.style.height = "210px";
bigBone.style.width = "710px";

var boneCopy = currDoc.createElement("div");
boneCopy.id = "boneCopy";
boneCopy.style.backgroundColor = "rgb(255,255,255)"
boneCopy.style.position = "relative";
boneCopy.style.left = "57px";
boneCopy.style.top = "30px";
boneCopy.style.zIndex = "600";
boneCopy.style.width = "570px";
boneCopy.style.fontSize = "10pt !important";

var boneCloseBtn = currDoc.createElement("div");
boneCloseBtn.id = "boneCloseBtn";
boneCloseBtn.style.background = "url(http://www.studytroll.com/imgs/closeBtn.png) no-repeat 0 0";
boneCloseBtn.style.position = "relative";
boneCloseBtn.style.left = "630px";
boneCloseBtn.style.top = "30px";
boneCloseBtn.style.height = "35px";
boneCloseBtn.style.width = "36px";
boneCloseBtn.style.display = "block";
bigBone.appendChild(boneCloseBtn);
bigBone.appendChild(boneCopy);

var meatBone = currDoc.createElement("div");
meatBone.id = "meatBone";
meatBone.style.background = "url(http://www.studytroll.com/imgs/meatBone.png)";
meatBone.style.position = "fixed";
meatBone.style.right = "10px";
meatBone.style.top = "-282px";
meatBone.style.zIndex = "600";
meatBone.style.height = "282px";
meatBone.style.width = "707px";

var meatBoneCopy = currDoc.createElement("div");
meatBoneCopy.id = "meatBoneCopy";
meatBoneCopy.style.backgroundColor = "rgb(211,86,101)";
meatBoneCopy.style.position = "relative";
meatBoneCopy.style.left = "275px";
meatBoneCopy.style.top = "60px";
meatBoneCopy.style.zIndex = "600";
meatBoneCopy.style.width = "365px";
meatBoneCopy.style.fontSize = "10pt !important";

var meatBoneCloseBtn = currDoc.createElement("div");
meatBoneCloseBtn.id = "meatBoneCloseBtn";
meatBoneCloseBtn.style.background = "url(http://www.studytroll.com/imgs/closeBtn.png) no-repeat 0 0";
meatBoneCloseBtn.style.position = "relative";
meatBoneCloseBtn.style.left = "595px";
meatBoneCloseBtn.style.top = "35px";
meatBoneCloseBtn.style.height = "35px";
meatBoneCloseBtn.style.width = "36px";
meatBoneCloseBtn.style.display = "block";
meatBone.appendChild(meatBoneCloseBtn);
meatBone.appendChild(meatBoneCopy);

var trollArm = currDoc.createElement("div");
trollArm.id = "trollArm";
trollArm.style.background = "url(http://www.studytroll.com/imgs/trollArm.png) no-repeat 0 0";
trollArm.style.position = "fixed";
trollArm.style.zIndex = "9999";
trollArm.style.left = "50%";
trollArm.style.top = "50%";
trollArm.style.marginTop = "120px";
trollArm.style.marginLeft = "250px";
trollArm.style.height = "102px";
trollArm.style.width = "730px";
trollArm.style.display = "block";

var microBtn = currDoc.createElement("div");
microBtn.id = "microBtn";
microBtn.style.background = "url(http://www.studytroll.com/imgs/troll_import.png) no-repeat 0 0";
microBtn.style.backgroundColor = "rgb(180,180,180)";
microBtn.style.position = "fixed";
microBtn.style.zIndex = "9999";
microBtn.style.right = "0px";
microBtn.style.top = "0px";
microBtn.style.height = "27px";
microBtn.style.width = "27px";
microBtn.style.display = "block";
microBtn.style.marginTop = "3px";
microBtn.style.marginRight = "3px";
microBtn.style.border = "2px solid rgba(0,0,0)";
microBtn.style.cursor = "pointer";

var settingsHTML = "";
settingsHTML += "<span style='font-size:10pt;left:30px;font-weight:bold'>REMINDER RATE:</span> <span style='cursor:pointer;color:blue;font-size:9pt'><span style='text-decoration:underline' id='r30s'>30 sec.</span>     <span style='text-decoration:underline' id='r60s'>60 sec.</span>     <span style='text-decoration:underline' id='r90s'>90 sec.</span>     <span style='text-decoration:underline' id='roff'>disabled</span><br></span>";
settingsHTML += "<span style='font-size:10pt;left:30px;font-weight:bold'>TROLL RATE:</span> <span style='cursor:pointer;color:blue;font-size:9pt'><span style='text-decoration:underline' id='t2m'>2 min.</span>  <span style='text-decoration:underline' id='t4m'>4 min.</span>  <span style='text-decoration:underline' id='t6m'>6 min.</span>  <span style='text-decoration:underline' id='toff'>disabled</span><br></span>";
settingsHTML += "<span style='font-size:10pt;left:30px;font-weight:bold'>DIFFICULTY:</span> <span style='cursor:pointer;color:blue;font-size:9pt'><span style='text-decoration:underline' id='easy'>easy</span>  <span style='text-decoration:underline' id='med'>medium</span>  <span style='text-decoration:underline' id='hard'>hard</span><br></span>";
if (useCopyProtection) {
	settingsHTML += "<br><span id='copyProtSpan' class='copyProt' style=\"cursor:pointer\"><center><span style='font-size:11pt'><b>[Copy Protection is ON]</b></span><br><span style='font-size:9pt'>This prevents cheating by disabling<br>copying of the fact you are being quizzed on.<br><span style=\"color:blue;text-decoration:none;font-size:8pt;cursor:pointer\">CLICK HERE TO TURN IT OFF.</span></span><br><br>";
} else {
	settingsHTML += "<br><span id='copyProtSpan' class='copyProt' style=\"cursor:pointer\"><center><span style='font-size:11pt'><b>[Copy Protection is OFF]</b></span><br><span style='font-size:9pt'>When turned on, this prevents cheating by disabling<br>copying of the fact you are being quizzed on.<br><span style=\"color:blue;text-decoration:none;font-size:8pt;cursor:pointer\">CLICK HERE TO TURN IT ON.</span></span><br><br>";
}