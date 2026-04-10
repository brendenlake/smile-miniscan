/*
 * Requires:
 *     psiturk.js
 *     utils.js
 * 	   scan_stimuli.simple.js
 */

// Initalize psiturk object
var psiTurk = new PsiTurk(uniqueId, adServerLoc, mode);

var mycondition = condition;  // these two variables are passed by the psiturk server process
var mycounterbalance = counterbalance;  // they tell you which condition you have been assigned to
// they are not used in the stroop code but may be useful to you

// All pages to be loaded
var pages = [
	"instructions/instruct-1.html",
	"instructions/instruct-2.html",
	// "instructions/instruct-ready.html",
	"prequiz.html",
	"stage.html",
	"postquestionnaire.html",
	"debriefing.html"
];

psiTurk.preloadPages(pages);

var instructionPages = [ // add as a list as many pages as you like
	"instructions/instruct-1.html",
	"instructions/instruct-2.html",
	// "instructions/instruct-ready.html"
];

/********************
* HTML manipulation
*
* All HTML files in the templates directory are requested 
* from the server when the PsiTurk object is created above. We
* need code to get those pages from the PsiTurk object and 
* insert them into the document.
*
********************/

/**********************
* PRE-EXPERIMENT QUIZ *
**********************/

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

var Quiz = function () {

    var check_quiz = function () {
		var list_quizq = $(".qq").map(function(){return $(this).attr("name");}).get();
		list_quizq = [...new Set(list_quizq)];
		var nmiss = tu.checkQuiz(list_quizq);
		if (nmiss > 0) {
			alert('You answered ' + nmiss + ' questions incorrectly. Please re-read the instructions.');
            psiTurk.doInstructions(
		    	instructionPages, // a list of pages you want to display in sequence
		    	function() { // what you want to do when you are done with instructions    		
		    		currentview = new Quiz();
		    	} 
		    );
		}
		else { // passed
			alert('All of your answers are correct. Please proceed to the experiment.');
			currentview = new ScanExperiment();
		}
    }

    psiTurk.showPage('prequiz.html');

    $("#submit_quiz").click(function () {
	    check_quiz();
	});

};

var ScanExperiment = function() {

	var wordon; // time command is presented
	var nedit = 0; // number of edits made to stimuli

	// 
	var ntask = stimuli.test_items.length;
	for (var i=0; i<ntask; i++) {
		stimuli.test_items[i] = $.trim(stimuli.test_items[i]);
	}

	// 
	var stims = _.shuffle(stimuli.test_items);
	var codebook = {};
	var test_command_words;

	var assign_grounding = function () {

		var words_local = _.shuffle(words_scan);
		var colors_local = _.shuffle(colors_scan);

		// get unique input tokens and randomly map to pseudo-words
		var input_symbols = [];
		var input_dict = {};
		for (var i=0; i<ntask; i++) {
			curr_symbols = stims[i].split(" ");
			input_symbols = input_symbols.concat(curr_symbols);
		}		
		input_symbols = Array.from(new Set(input_symbols));
		input_symbols = _.shuffle(input_symbols);
		for (var i=0; i<input_symbols.length; i++) {
			input_dict[input_symbols[i]] = words_local[i];
		}

		// get unique output tokens and randomly map to colors
		var output_symbols = [];
		var output_dict = {}; // map action to color tag
		var output_dict_reverse = {}; // map color tag to action
		output_symbols = output_symbols.concat(stimuli.pool); // add pool items

		output_symbols = Array.from(new Set(output_symbols));
		output_symbols = _.shuffle(output_symbols);
		for (var i=0; i<output_symbols.length; i++) {
			output_dict[output_symbols[i]] = colors_local[i]
			output_dict_reverse[colors_local[i]] = output_symbols[i];
		}

		// added code to map un-used colors to undefined action
		for (var i=output_symbols.length; i<colors_local.length; i++) {
			output_dict_reverse[colors_local[i]] = 'undefined_action';
		}

		codebook = {
			input_dict : input_dict,
			output_dict : output_dict,
			output_dict_reverse : output_dict_reverse,
		};

	};

	var convert_command_to_words = function (mycommand) {
		// convert an abstract command to pseudoword sequence
		mycommand = mycommand.split(" ");
		var mywords = [];
		for (var i=0; i<mycommand.length; i++) {
			mywords.push( codebook.input_dict[mycommand[i]] );
		}
		return mywords.join(" ");
	};

	var make_example_table = function (mystimuli) {
		var ncol = 1;
		var space_symbol = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
		var nrow = Math.ceil(mystimuli.length / ncol);
		var sc = 0;
		$('#table-example').html('');
		for (var r=0; r<nrow; r++) {
			var myrow = $("<tr>");
			for (var c=0; c<ncol; c++) {
				var space_cell = $("<td>").html(space_symbol);
				if (sc < mystimuli.length) {
					var command_cell = $("<td>").html(convert_command_to_words(mystimuli[sc][0]));
					var circle_cell = make_circles_cell(mystimuli[sc][1]);
				}
				else {
					var command_cell = $("<td>").html('');
					var circle_cell = $("<td>").html('');
				}				
				$(myrow).append( command_cell );
				$(myrow).append( circle_cell );
				$(myrow).append( space_cell );
				sc += 1;
			}
			$('#table-example').append(myrow);
		}
	};

	var make_circle = function (mycolor, myclass) {
		var mycircle = $("<li>").attr('class',myclass).html(
						$("<span>").attr('style',"color:"+mycolor+';').html("&#x25CF")
					);
		return mycircle;
	};

	var make_circles_cell = function (mystimulus) {		
		var mylist = $("<ul>");
		var mysequence = mystimulus.split(" ");
		for (var i=0; i<mysequence.length; i++) {
			var mycircle = make_circle( codebook.output_dict[mysequence[i]], 'data_li');
			$(mylist).append(mycircle);
		}
		return $("<td>").append(mylist);
	};

	var post_pool = function (colors_post_local, mytag) {		
		// colors_post_local = _.shuffle(colors_post_local);
		var colors_post_local = colors_post_local.slice();
		for (var i=0; i<colors_post_local.length; i++) {
			colors_post_local[i] = codebook.output_dict[colors_post_local[i]];
		}

		// create the pool of color circles for dragging
		for (var i=0; i<colors_post_local.length; i++) {
			mycircle = make_circle(colors_post_local[i] , 'source_li' );
			$('#'+mytag).append(mycircle);
		}

		// make the items draggable
		$(".source_li").draggable({helper: "clone", connectToSortable: ".response_array"});
		$(".source_li").disableSelection();
	};

	var process_response = function (myidx) {
		// get "response to command" array as a string of abstract actions

		var myresponse = $('#response_array_' + myidx + ' span').map( function () { 
							return $(this).attr('style');
						});
		myresponse = $.makeArray(myresponse);
		// extract color from style tag
		myresponse_abstract = [];
		for (var i=0; i<myresponse.length; i++) {
			mytag = myresponse[i];
			preString = 'color:';
			postString = ';';
			preIndex = mytag.indexOf(preString);
			postIndex = mytag.indexOf(postString);
			mytag = mytag.substring(preIndex + preString.length, postIndex);
			myresponse_abstract.push(codebook.output_dict_reverse[mytag]); // convert to abstract action
		}

		assert(myresponse.length === myresponse_abstract.length, "Error: response processor has failed. Please report to experimenter.");

		return { 
			abstract : myresponse_abstract.join(' '),
			raw : myresponse.join(' ')
		};
	};

	var next = function() {
		
		assign_grounding(stims);
		post_pool(stimuli.pool,'source_array_1');
		post_pool(stimuli.pool,'source_array_2');

		for (var i=0; i<ntask; i++) {
			var stim = stims[i];
			var myidx = i+1;
			test_command_words = convert_command_to_words(stim);
			show_words( test_command_words, myidx );
		}
		$("#container-submit").attr('style','');
		$("#submit_message").text('');
		wordon = new Date().getTime();
	};

	var debug_console = function () {
		var mystr = '* DEBUG: Round ' + cycle_count + '; Command length ' + curr_length + '; Accuracy ' + Math.round(100.0 * epoch_correct / epoch_count);
		mystr += '; Trial ' + (epoch_count+1) + ' of ' + len_epoch + ' * ';
		$('#debug').text(mystr);
	};
	
	var response_handler = function() {
		
		// check that the whole survey is done
		var items = [];
		for (var i=0; i<ntask; i++) {
			var myresponse_object = process_response(i+1);	
			var myresponse = myresponse_object.abstract;
			if (myresponse.length == 0) {
				$('#submit_message').html('Response to command "' + convert_command_to_words(stims[i]) + '" is empty.<br>');
				return;
			}
			items.push([stims[i], myresponse]);
		}

		// check that participant is satisfied with responses		
		make_example_table(items);
		$("#div-trial").attr('style','display:none;');
		$("#div-confirm").attr('style','');		
		// record_and_finish();
	};

	var edit_responses = function () {
		// participant selected to edit responses
		$("#div-trial").attr('style','');
		$("#div-confirm").attr('style','display:none;');
		nedit += 1;	
	};

	var record_and_finish = function() {
		// record the data and move to the post-test questionnaire
		var rt = new Date().getTime() - wordon;
		for (var i=0; i<ntask; i++) {
			var myresponse_object = process_response(i+1);	
			var myresponse = myresponse_object.abstract;
			var myresponse_raw = myresponse_object.raw;

			var test_command_words = convert_command_to_words(stims[i]);

			psiTurk.recordTrialData({
	                                 'phase':'trial',
	                                 'nedit':nedit,
	                                 // 'abs_input':stimuli[i],  // abstract input string ('p1 m1' etc.)
	                                 'abs_input':stims[i], // LINE CHANGED AFTER EXPERIMENT WAS RUN... this was a bug
	                                 'raw_input':test_command_words, // words presented to participant ('dax zup dax')                                     
	                                 'abs_response':myresponse, // abstract response (a1, a2, etc.)
	                                 'raw_response':myresponse_raw, // raw parsed html output ('color:#ff0000; color:#b7b600;')
	                                 'rt':rt} // reaction time
	                               );
		}

	    currentview = new Questionnaire();
	};
	
	var show_words = function(text, myid) {
		tag = "command_" + myid;
		$('#'+tag).text(text);
	};

	// Load the stage.html snippet into the body of the page
	psiTurk.showPage('stage.html');

	// set up sorting


	$("#submit_button").click( response_handler );
	$("#edit_button").click( edit_responses );
	$("#to_survey_button").click( record_and_finish );

	for (var i=1; i<ntask+1; i++) {

		$("#response_array_"+i).sortable();
		$('#response_array_'+i).disableSelection();

		$("#reset_button_"+i).click( (function (mystr) {
		 		return function() { $(mystr).html('') }
			})('#response_array_'+i) 
		);
	}	

	// Start the test
	next();
};


/****************
* Questionnaire *
****************/

var Questionnaire = function() {

	var error_message = "<h1>Oops!</h1><p>Something went wrong submitting your HIT. This might happen if you lose your internet connection. Press the button to resubmit.</p><button id='resubmit'>Resubmit</button>";

	record_responses = function() {

		psiTurk.recordTrialData({'phase':'postquestionnaire', 'status':'submit'});

		$('textarea').each( function(i, val) {
			psiTurk.recordUnstructuredData(this.id, this.value);
		});
		$('select').each( function(i, val) {
			psiTurk.recordUnstructuredData(this.id, this.value);		
		});

	};

	prompt_resubmit = function() {
		document.body.innerHTML = error_message;
		$("#resubmit").click(resubmit);
	};

	resubmit = function() {
		document.body.innerHTML = "<h1>Trying to resubmit...</h1>";
		reprompt = setTimeout(prompt_resubmit, 10000);
		
		psiTurk.saveData({
			success: function() {
			    clearInterval(reprompt); 
                psiTurk.computeBonus('compute_bonus', function(){
                	psiTurk.completeHIT(); // when finished saving compute bonus, the quit
                }); 


			}, 
			error: prompt_resubmit
		});
	};

	// Load the questionnaire snippet 
	psiTurk.showPage('postquestionnaire.html');
	psiTurk.recordTrialData({'phase':'postquestionnaire', 'status':'begin'});
	
	$("#next").click(function () {
	    record_responses();
	    psiTurk.saveData({
            success: function(){
                psiTurk.showPage('debriefing.html');
                $("#finish_button").click(function () { 
                    psiTurk.completeHIT();
                } );
            }, 
            error: prompt_resubmit});
	});    	
};

// Task object to keep track of the current phase
var currentview;

/*******************
 * Run Task
 ******************/
$(window).load( function(){
    psiTurk.doInstructions(
    	instructionPages, // a list of pages you want to display in sequence
    	function() { currentview = new Quiz(); } // what you want to do when you are done with instructions
    	// function() { currentview = new ScanExperiment(); } // what you want to do when you are done with instructions
    );
});