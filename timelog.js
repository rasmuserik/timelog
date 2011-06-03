function main() {
    $("body").html('<div><input id=newAction />' +
        '<button onclick="create()">Create</button>' +
        '<button onclick="change()">Change</button></div>' +
        '<div id="actions"></div>' +
        '<input id="storageName" /><input size="2" type="number" id="daysToSync" value="2" /><button onclick="sync()">sync</button></div>' +
        '<pre id="stat"></pre>' +
        '<pre id="log"></div>');
    setTimeout(update, 0);

    var actionsTag = document.getElementById('actions');
    var statTag = document.getElementById('stat');
    var logTag = document.getElementById('log');
    var dayedEvents;

    var storageName = localStorage.getItem("defaultStorageName") || "timelog";
    $("#storageName").val(storageName);

    events = JSON.parse(localStorage.getItem(storageName) || "[]");

    var syncing = false;

    window.sync = function sync() {
        if(syncing) return;
        syncing = true;

        update();
        storageName = $("#storageName").val();
        events = JSON.parse(localStorage.getItem(storageName) || "[]");
        update();

        $("#newAction").val("...syncing...");

        var url = "http://storage.solsort.dk/timelog-" + storageName + "/";

        var dateToFetch = (new Date()).getTime();
        var i = 0;

        var ss_events = {};
        var allevents = [];
        function fetchDate() {
            if(++i > +$("#daysToSync").val()) {
                fetchingDone();
                return;
            }
            var bucket = (new Date(dateToFetch)).toISOString().slice(0,10)
            $("#storageName").val("...syncing " + bucket + "...");
            dateToFetch -= 24*60*60*1000;
            $.ajax({
                url: url + bucket,
                type: "GET",
                dataType: "json",
                error: function(x) {
                    //console.log("GET error", x);
                    fetchDate();
                },
                success: function(data) {
                    //console.log("GETsuccess",bucket, data, dayedEvents[bucket]);
                    var resultEvents = [];
                    var t = {};
                    function addelem(elem) {
                        t[elem.beginTime] = elem;
                    };
                    Array.isArray(data) && data.forEach(addelem);
                    Array.isArray(dayedEvents[bucket]) && dayedEvents[bucket].forEach(addelem);
                    Object.keys(t).forEach(function(key) {
                        resultEvents.push(t[key]);
                        allevents.push(t[key]);
                    });
                    //console.log(JSON.stringify(resultEvents), data, JSON.stringify(data));
                    localStorage.setItem(storageName + " " + bucket, JSON.stringify(resultEvents));

                    
                    var reqObj = {
                        type: "POST",
                        url: url+bucket,
                        data: { 
                            put: JSON.stringify(resultEvents),
                            prev: JSON.stringify(data)
                        }//,
                        //success: function(x) { console.log("POST success", x, this); },
                        //failure: function(x) { console.log("POST failure", x, this); }
                    };
                    //XXXXX = reqObj;
                    $.ajax(reqObj);

                    fetchDate();
                }
            });
        }
        fetchDate();

        function fetchingDone() {
            syncing = false;
            events = allevents;
            $("#storageName").val(storageName);
            update();
        }
    }

    function update() {
        events.sort(function(a, b) { return Date.parse(b.beginTime) - Date.parse(a.beginTime); });
        var store = {};
        var times = {};
        var actions = {};
        var prevTime = Date.now();

        dayedEvents = {};

        var first = true;
        events.forEach(function(a) {
            if(first) {
                $("#newAction").val(a.name);
                first = false;
            }
            a.usedTime = Math.round((prevTime - Date.parse(a.beginTime))/36000)/100;

            var isotime = (new Date(a.beginTime)).toISOString();
            var bucket = isotime.slice(0,10);

            var daystore = store[bucket] || {};
            store[bucket] = daystore;
            daystore[isotime] = a;

            var time = times[bucket] || {};
            times[bucket] = time;
            time[a.name] = (time[a.name] || 0) + a.usedTime;

            actions[a.name] = true;
            
            prevTime = Date.parse(a.beginTime);
                
            if(!dayedEvents[bucket]) {
                dayedEvents[bucket] = [];
            };
            dayedEvents[bucket].push(a);
        });

        statTag.innerHTML = JSON.stringify(times, undefined, 2);
        logTag.innerHTML = JSON.stringify(events, undefined, 2) + JSON.stringify(dayedEvents, undefined, 2);

        actionsTag.innerHTML = "";
        Object.keys(actions).forEach(function(action) {
            var button = document.createElement('button');
            button.innerHTML = action;
            button.addEventListener("click", setAction.bind(undefined, action), false); 
            actionsTag.appendChild(button);
        });

        localStorage.setItem(storageName, JSON.stringify(events));
    }
    setInterval(update, 10000);
    
    setAction = function(actionName) {
        events.push({ name: String(actionName), 
            beginTime: (new Date()).toISOString()});
        update();
    }

    change = function() {
        events[0].name = document.getElementById("newAction").value.trim();
        update();
    }
    
    create = function() {
        setAction(document.getElementById("newAction").value.trim());
    }
};

$(main);
