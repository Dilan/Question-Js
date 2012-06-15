$(function() {

// -------------------------------------------------------------------------------------------------
// Model
// -------------------------------------------------------------------------------------------------

    var Match = Backbone.Model.extend({
        defaults : {
            exact : 0,
            partial : 0
        }
    });

    var MatchBuilder = (function() {
        return {
            getMatch: function(original, compare) {
                var exact = 0; var partial = 0;

                for(var i=0; i<original.length; i++) {
                    if(original[i] == compare[i]) {
                        exact++;
                    }
                    else if(original.indexOf(compare[i]) != -1 ) {
                        partial++;
                    }
                }

                return new Match(
                    {
                        exact:exact,
                        partial:partial
                    }
                );
            }
        };
    })();

// -------------------------------------------------------------------------------------------------

    var Symbol = Backbone.Model.extend({
        defaults : {
            uid   : null,
            value : null,
            color : null
        }
    });

    var SymbolList = Backbone.Collection.extend({
        model: Symbol,
/*
        initialize: function(attributes) {
           if(undefined !== attributes && null !== attributes) {

                for(var i=0; i<attributes.length; i++) {
                    this.add(
                        new Symbol(
                            attributes[i]
                        )
                    );
                }
           }
        },
*/
        toString: function() {
            return (
                this.map(
                    function(model) {
                        return model.get("value");
                    }
                )).join('');
        }
    });

// -------------------------------------------------------------------------------------------------

    var Question = Backbone.Model.extend({
        defaults : {
            uid     : null,
            symbols : new SymbolList()
        },

        initialize: function(attributes) {
            if(undefined !== attributes) {
                if(undefined !== attributes.symbols) {
                    this.set('symbols',
                        new SymbolList(
                            attributes.symbols
                        )
                    );
                }
            }
        },

        toString: function() {
            var value = '';
            _.each(this.get('symbols').toJSON(), function(item) {
                value += item.value;
            });
            return value;
        },

        isEmpty: function() {
            return (this.get('symbols').length) ? false : true;
        }
    });

// -------------------------------------------------------------------------------------------------

    var Suggestion = Backbone.Model.extend({
        defaults : {
            uid     : null,
            match   : new Match(),
            symbols : null
        },

        initialize: function(attributes) {
            if(undefined !== attributes) {
                if(undefined !== attributes.symbols) {
                    this.set('symbols',
                        new SymbolList(
                            attributes.symbols
                        )
                    );
                }
            }
        }
    });

// -------------------------------------------------------------------------------------------------

    var SuggestionList = Backbone.Collection.extend({

        model: Suggestion,

        isSuggestionExist: function(uid) {
            return this.filter(
                function(suggestion){
                    return suggestion.get('uid') == uid; }
            );
        }
    });

// -------------------------------------------------------------------------------------------------

    var Game = Backbone.Model.extend({

        localStorage: new Store("game-version-1.0"),

        defaults : {
            suggestionList : new SuggestionList(),
            question       : new Question()
        },

        // -----------------------------------------------------------------------------------------
        // public methods
        // -----------------------------------------------------------------------------------------

        changeQuestion:function(value) {
            var question = new Question();

            question.set("uid",question.cid);
            question.set("symbols", this.createSymbolList(value, question.cid));

            this.setQuestion(question);
        },

        createSuggestion:function(value) {
            var suggestion = new Suggestion();
            
            suggestion.set("uid",suggestion.cid);
            suggestion.set("symbols",this.createSymbolList(value,suggestion.cid));
            suggestion.set("match",this.compareWithQuestion(value));

            this.addSuggestion(suggestion);
        },

        // -----------------------------------------------------------------------------------------
        // private methods
        // -----------------------------------------------------------------------------------------

        resetSuggestionList:function() {
            this.get('suggestionList').reset();
        },

        setQuestion:function(question) {
            if(question.isEmpty()) {
                    this.trigger("questionIsEmpty");
            } else {
                    this.get("question").set(question);
            }
        },

        addSuggestion:function(suggestion) {
            this.get("suggestionList").add(suggestion);
        },

        createSymbolList:function(value, uid) {
            var symbol_list = new SymbolList;

            for(var i=0; i<value.length; i++) {
                var symbol = new Symbol(
                    {
                        value: value[i]
                    }
                );
                // set UID into attribute to make possible to use [JSON.stringify]
                symbol.set("uid", uid + '-' + symbol.cid);
                symbol_list.add(symbol);
            }

            return symbol_list;
        },

        compareWithQuestion:function(value) {
            return MatchBuilder.getMatch(
                this.get("question").toString(),
                value
            );
        },

        // method called when object [SAVE] OR [RESTORE] as a result we should not update suggestion list twice
        parse:function(response) {

            var json = JSON.parse(
                JSON.stringify(
                    response
                )
            );

            // 1. restore Question
            this.setQuestion(
                new Question(
                    json.question
                )
            );
            // 2. restore SuggestionList
            for(i=0; i<json.suggestionList.length; i++) {
                if(false == this.get("suggestionList").isSuggestionExist(json.suggestionList[i].uid)) {
                    var symbols = new SymbolList(
                        json.suggestionList[i].symbols
                    );

                    var suggestion = new Suggestion();

                    suggestion.set("uid",json.suggestionList[i].uid);
                    suggestion.set("symbols",symbols);
                    suggestion.set("match",this.compareWithQuestion(symbols.toString()));

                    this.addSuggestion(suggestion);
                }
            }
        }
    });

// -------------------------------------------------------------------------------------------------
// View
// -------------------------------------------------------------------------------------------------

    var QuestionView = Backbone.View.extend({

        //... is a list tag.
        tagName:  "li",

        // Cache the template function for a single item.
        template: _.template($('#question-template').html()),

        initialize: function() {
          this.model.bind('change', this.render, this);
        },

        render: function() {
          this.$el.html(
              this.template(
                  JSON.parse(
                      JSON.stringify(
                          this.model
                      )
                  )
              )
          );
          return this;
        }

    });

// -------------------------------------------------------------------------------------------------

    var SuggestionView = Backbone.View.extend({

        //... is a list tag.
        tagName:  "li",

        // Cache the template function for a single item.
        template: _.template($('#suggestion-item-template').html()),

        events: {

        },

        initialize: function() {
          this.model.bind('change', this.render, this);
          this.model.bind('destroy', this.remove, this);
        },

        render: function() {
          this.$el.html(
              this.template(
                  JSON.parse(
                      JSON.stringify(
                          this.model
                      )
                  )
              )
          );
          return this;
        }

    });

// -------------------------------------------------------------------------------------------------

    var GameView = Backbone.View.extend({
        el: "#game",

        events: {
            "keypress #new-suggestion":  "createOnEnter",
            "click #reset": "resetSuggestionList"
        },

        initialize: function(options) {

            this.input = this.$("#new-suggestion");

            this.dictionary = options['dictionary'];

            this.game = new Game({ id: 1 });

            // listener
            this.game.get('suggestionList').bind('add', this.addSuggestion, this);
            this.game.get('question').bind('change', this.addQuestion, this);
            this.game.bind('questionIsEmpty', this.generateQuestion, this);

            this.game.fetch();
        },

        // -----------------------------------------------------------------------------------------

        createOnEnter: function(e) {
            if (e.keyCode != 13) return;
            if (!this.input.val()) return;

            this.game.createSuggestion(this.input.val());
            this.game.save();
            this.input.val('');
        },

        // -----------------------------------------------------------------------------------------

        generateQuestion: function() {
            this.game.changeQuestion(this.dictionary.random());
            //this.game.save();
        },

        resetSuggestionList: function() {
            this.game.resetSuggestionList();

            this.game.get("question").set(
                new Question(

                )
            );

            this.game.save();
            this.$("#suggestion-list").html('');
        },

        addSuggestion: function(suggestion) {
            var view = new SuggestionView({model: suggestion});
            this.$("#suggestion-list").append(view.render().el);

            var thisGameView = this;
            for (var i = 0; i < suggestion.get("symbols").length; i++) {
                $('#' + suggestion.get("symbols").at(i).get("uid")).bind(
                    'click',
                    jQuery.proxy(thisGameView, 'changeColorOnClick')
                );
            }
        },

        addQuestion: function(question) {
            var view = new QuestionView({ model: question });
            this.$("#question-box").html(view.render().el);

            var thisGameView = this;
            for (var i = 0; i < question.get("symbols").length; i++) {
                $('#' + question.get("symbols").at(i).get("uid")).bind(
                    'click',
                    jQuery.proxy(thisGameView, 'changeColorOnClick')
                );
            }
        },

        changeColorOnClick: function(e) {
            var id = e.target.id;
            alert("You click to #"+id);
        }

    });

    var gameView = new GameView({
        dictionary: dictionary
    });

});