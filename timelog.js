document.write("hello world");


function main() {
    var body = document.getElementsByTagName("body")[0];
    body.innerHTML = '<div><input id=newAction />' +
        '<button onclick="create()">Create</button></div>' +
        '<button onclick="change()">Change</button></div>' +
        '<div id="actions"></div>' +
        '<pre id="stat"></pre>' +
        '<pre id="log"></div>';
    setTimeout(update, 0);

    var actionsTag = document.getElementById('actions');
    var statTag = document.getElementById('stat');
    var logTag = document.getElementById('log');

    function toISO(x) { return (new Date(x)).toISOString(); };


    events = JSON.parse(localStorage.getItem("timelog") || "[]");

    function update() {
        events.sort(function(a, b) { return Date.parse(b.beginTime) - Date.parse(a.beginTime); });
        var store = {};
        var times = {};
        var actions = {};
        var prevTime = Date.now();
        events.forEach(function(a) {
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
        });

        logTag.innerHTML = JSON.stringify(events, undefined, 2);
        statTag.innerHTML = JSON.stringify(times, undefined, 2);

        actionsTag.innerHTML = "";
        Object.keys(actions).forEach(function(action) {
            var button = document.createElement('button');
            button.innerHTML = action;
            button.addEventListener("click", setAction.bind(undefined, action), false); 
            actionsTag.appendChild(button);
        });

        localStorage.setItem("timelog", JSON.stringify(events));
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
