function main() {
    $("body").html('<div><input id=newAction />' +
        '<button onclick="create()">Create</button>' +
        '<button onclick="change()">Change</button></div>' +
        '<div id="actions"></div>' +
        '<div><button onclick="sync()">sync</button><button onclick="syncAll()">syncAll</button></div>' +
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
        function toUnixTime(e) {
            return (new Date(e.beginTime)).getTime() / 1000 | 0;
        }

        now = (new Date()).getTime()/1000|0;

        var localChanges = {};
        for(var i=0;i<events.length;++i) {
            if(toUnixTime(events[i]) > now - 24*60*60*7) {
                localChanges [toUnixTime(events[i])] = events[i];
            }
        }


        remoteChanges = [];
        $.ajax({
            url: "http://storage.solsort.dk/timelog", 
            dataType: "jsonp", 
            data: {time:now}, 
            success: function(data) {
                data.forEach(function(elem) {
                    if(!localChanges[elem.time]) {
                        remoteChanges.push(elem);
                        events.push({
                            beginTime: (new Date(elem.time*1000)).toISOString(),
                            name: elem.action});
                    } else if(localChanges[elem.time].name === elem.action) {
                        delete localChanges[elem.time];
                    }
                });

                console.log(localChanges, remoteChanges);

                var localKeys = Object.keys(localChanges);
                var i = 0;
                function next() {
                    if(i >= localKeys.length) {
                        update();
                        console.log("next-key exit");
                        return;
                    }
                    event = localChanges[localKeys[i]];
                    ++i;
    
                    console.log("next", event, this);
                    $.ajax({
                        url: "http://storage.solsort.dk/timelog",
                        dataType: "jsonp",
                        data: {
                            action: event.name.replace(RegExp("[^a-zA-Z0-9-_]", "g"), function(a) { function hex(i,n) {return n?hex(i/16,--n)+"0123456789abcdef"[i&15]:""}; return "\\u"+hex(a.charCodeAt(0),4)}),
                            time: toUnixTime(event)
                        },
                        success: next, error: next
                    });
                }
                next();
            }
        });
    }
    

    window.syncAll = function syncAll() {
        var i = 0;
        function next() {
            if(i >= events.length) {
                update();
                console.log("next-exit");
                return;
            }
            var event = events[i]
            ++i;

            console.log("next", event, this);
            $.ajax({
                url: "http://storage.solsort.dk/timelog",
                dataType: "jsonp",
                data: {
                    action: event.name.replace(RegExp("[^a-zA-Z0-9-_]", "g"), function(a) { function hex(i,n) {return n?hex(i/16,--n)+"0123456789abcdef"[i&15]:""}; return "\\u"+hex(a.charCodeAt(0),4)}),
                    time: toUnixTime(event)
                },
                success: next, error: next
            });

        }
        next();
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
