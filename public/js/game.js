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

    });

    var SuggestionList = Backbone.Collection.extend({

        model: Suggestion,

        isOrderExist: function(order) {
            return this.filter(
                function(suggestion){ return suggestion.get('order') == order; }).length?true:false;
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
            for(i=0; i<json.suggestionList.length; i++) {
                if(false == this.get("suggestionList").isOrderExist(json.suggestionList[i].order)) {
                    this.get("suggestionList").add(
                        json.suggestionList[i]
                    );
                }
            }
        },

        createSuggestion:function(value) {
            this.get("suggestionList").add({
                value: value,
                order: this.get("suggestionList").length
            });
            this.save();
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
          this.$el.html(this.template(this.model.toJSON()));
          return this;
        }

    });

    var GameView = Backbone.View.extend({
        el: "#game",

        events: {
            "keypress #new-suggestion":  "createOnEnter",
            "click #button": "sample"
        },

        initialize: function() {
            this.input = this.$("#new-suggestion");
            this.game = new Game({ id:1 });

            this.game.get('suggestionList').bind('add', this.addSuggestion, this);

            this.game.fetch();
        },

        createOnEnter: function(e) {
            if (e.keyCode != 13) return;
            if (!this.input.val()) return;

            this.game.createSuggestion(this.input.val());

            this.input.val('');
        },

        sample: function() {
            this.game.get('suggestionList').reset();
            this.game.save();
        },

        addSuggestion: function(suggestion) {
            var view = new SuggestionView({model: suggestion});
            this.$("#suggestion-list").append(view.render().el);
        }

    });

    var gameView = new GameView();

});