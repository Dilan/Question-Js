$(function() {

    var Match = Backbone.Model.extend({
        defaults : {
            exact : 0,
            partial : 0
        }
    });

    var Question = Backbone.Model.extend({
        defaults : {
            value : "сойка"
        }

    });

    var Suggestion = Backbone.Model.extend({
        defaults : {
            uid     : null,
            match   : new Match(),
            value   : null,
            symbols : null
        }
    });

    var Symbol = Backbone.Model.extend({
        defaults : {
            uid   : null,
            value : null,
            color : null
        }
    });

    var SymbolList = Backbone.Collection.extend({

        model: Symbol

    });

    var SuggestionList = Backbone.Collection.extend({

        model: Suggestion,

        isSuggestionExist: function(uid) {
            return this.filter(
                function(suggestion){ return suggestion.get('uid') == uid; }
            );
        }

    });

    var Game = Backbone.Model.extend({

        localStorage: new Store("game-version-1.0"),

        defaults : {
            suggestionList : new SuggestionList(),
            question : new Question()
        },

        parse:function(response) {

            var json = JSON.parse(
                JSON.stringify(
                    response
                )
            );

            // restore from Storage
            this.get("question").set(
                new Question(
                    json.question
                )
            );
            // parse method called when object [SAVE] and when [RESTORE] as a result we should not update suggestion list twice
            for(i=0; i<json.suggestionList.length; i++) {
                if(false == this.get("suggestionList").isSuggestionExist(json.suggestionList[i].uid)) {
                    this.addSuggestion(json.suggestionList[i]);
                }
            }
        },

        addSuggestion:function(suggestion) {
            this.get("suggestionList").add(suggestion);
        },

        resetSuggestionList:function() {
            this.get('suggestionList').reset();
            this.save();
        },

        createSuggestion:function(value) {
            var suggestion = new Suggestion(
                {
                    match: this.getMatch(value),
                    value: value
                }
            );
            suggestion.set(
                "uid",
                suggestion.cid
            );
            suggestion.set(
                "symbols",
                this.createSymbolList(
                    value,
                    suggestion.cid
                )
            );

            this.addSuggestion(suggestion);
            this.save();
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

        getMatch:function(value) {
            var exact = 0; var partial = 0;
            var question = this.get("question").get("value");

            for(i=0; i<question.length; i++) {
                if(question[i] == value[i]) {
                    exact++;
                }
                else if(question.indexOf(value[i]) != -1 ) {
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

    });

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

    var GameView = Backbone.View.extend({
        el: "#game",

        events: {
            "keypress #new-suggestion":  "createOnEnter",
            "click #reset": "resetSuggestionList"
        },

        initialize: function() {
            this.input = this.$("#new-suggestion");
            this.game = new Game({ id:1 });

            // listener
            this.game.get('suggestionList').bind('add', this.addSuggestion, this);

            this.game.fetch();
        },

        createOnEnter: function(e) {
            if (e.keyCode != 13) return;
            if (!this.input.val()) return;

            this.game.createSuggestion(this.input.val());
            this.input.val('');
        },

        resetSuggestionList: function() {
            this.game.resetSuggestionList();
            this.$("#suggestion-list").html('');
        },

        addSuggestion: function(suggestion) {
            var view = new SuggestionView({model: suggestion});
            this.$("#suggestion-list").append(view.render().el);

            // bind click
            var thisGameView = this;
            _.each(suggestion.get("symbols"), function(item) {
                $('#'+item.uid).bind(
                    'click',
                    jQuery.proxy(thisGameView, 'changeColorOnClick')
                );
            });
        },

        changeColorOnClick: function(e) {
            var id = e.target.id;
            alert("You click to #"+id);
        }

    });

    var gameView = new GameView();

});