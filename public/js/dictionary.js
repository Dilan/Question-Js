var dictionary = (function() {

    var list = [
        "время",
        "товар",
        "ложка"
    ];

    return {
        random: function() {
            return list[Math.floor(Math.random()*list.length)];
        }
    };
})();