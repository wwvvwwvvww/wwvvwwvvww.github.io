var users = [];

var canvas2 = document.createElement('canvas');
canvas2.width = 800;
canvas2.height = 600;
var context2 = canvas2.getContext('2d');

var raster = new Raster({
	source: "white.png",
	position: view.center});

var path;

var activeColor = 'black'
var activeTool = 1;
var thickness = 2;

function onMouseDown(event) {
	if(currentDrawer != myid) return
	var tab = [activeTool, [Math.round(event.point.x), Math.round(event.point.y)], activeColor, thickness];
	draw_newPath(tab);
	connection.send("3" + JSON.stringify(tab));
}

var pos;
function onMouseDrag(event){
	if(activeTool != 1) return;
	if(currentDrawer != myid) return;
	var newpos = [clamp(Math.round(event.point.x),1,800),clamp(Math.round(event.point.y),1,600)];
	if(pos == null || newpos[0] != pos[0] | newpos[1] != pos[1]){
		pos = newpos;
		draw_continuePath(pos);
		connection.send("4" + JSON.stringify(pos));
	}
}

function onMouseUp(event) {
	if(activeTool != 1) return;
	if(currentDrawer != myid) return;
	draw_finishPath();
	connection.send("5");
}

function onMouseMove(event){
}

function clamp(a, b, c){
	return Math.min(c,Math.max(a,b));
}

function draw_newPath(tab){
	if(tab[0] == 1){
		path = new Path({
			segments: [new Point(tab[1][0], tab[1][1])],
			strokeColor: tab[2],
			strokeWidth: tab[3],
			strokeCap: 'round',
			strokeJoin: 'round'
		});
	}else{

		context2.fillStyle = tab[2];
		context2.fillFlood(tab[1][0],tab[1][1], 32);
		
		raster.drawImage(canvas2);
	}
}

function draw_continuePath(pos){
	var point = new Point(pos[0], pos[1])
	path.add(point);
}

function draw_finishPath(){
	var tmp = project.layers[0].rasterize(72);
	
	context2.clearRect(0, 0, canvas2.width, canvas2.height);
	context2.drawImage(tmp.canvas,0,0);
	raster.remove();
	
	raster = tmp;
	path.remove();
}

function addToChat(userid, str, spec){
	var message = chatTemplate.cloneNode(true);
	message.removeAttribute("id");
	var name;
	if(userid == 's'){
		name = "System";
	}else{
		for(var i = 0; i  < users.length; i++){
			if(users[i].id == userid){
				name = users[i].name;
			}
		}
	}

	switch(parseInt(spec)){
		case 1: //light green - hidden text
			message.style.color = "#64c864";
			break;
		case 2: // green - win
			message.style.color = "#00e600";
			break;
		case 3: // red - dc
			message.style.color = "#e61414";
			break;
		default:
			break;
	}

	message.children[0].textContent = name + ": ";
	message.children[1].textContent = str;
	var scrolledToBottom = chatMessageList.scrollTop === (chatMessageList.scrollHeight - chatMessageList.offsetHeight);

	chatMessageList.appendChild(message);

	if(scrolledToBottom) chatMessageList.scrollTop = (chatMessageList.scrollHeight - chatMessageList.offsetHeight);
}

function compare(a,b) {
	if (a.score < b.score)
		return 1;
	if (a.score > b.score)
		return -1;
	return 0;
}

function refreshUserList(){
	var usersc = users.slice();

	usersc.sort(compare);

	var rank = 0;
	var score = -1;
	for(var i = 0; i < usersc.length; i++){
		if(usersc[i].score != score)
			rank++;
		
		score = usersc[i].score;
		for(var j = 0; j < users.length; j++){
			if(users[j].id == usersc[i].id){
				users[j].rank = rank;
			}
		}
	}

	while (userList.firstChild) {
		userList.removeChild(userList.firstChild);
	}
	for(var i = 0; i < users.length; i++){
		var user = userTemplate.cloneNode(true);
		user.removeAttribute("id");
		user.children[0].textContent = users[i].rank
		user.children[1].textContent = users[i].name + (users[i].id == myid ? " (you)" : "");
		user.children[2].textContent = users[i].score;

		if(currentDrawer == users[i].id)
			user.children[3].style.display = "block";

		if(users[i].fin == 1)
			user.style.backgroundColor = "#50e050";

		userList.appendChild(user);
	}
}

formChat.onsubmit = function(){
	connection.send("2"+formChatInput.value)
	formChatInput.value = "";

	return false;
}

function parse(data){
	switch(data[0]){
		case '0':
			users = JSON.parse(data.substring(1));
			refreshUserList();
			break;
		case '1':
			myid = data.substring(1);
			refreshUserList();
			break;
		case '2':
			addToChat(data.substring(2, data.indexOf("/")), data.substring(data.indexOf("/") + 1), data[1]);
			break;
		case '3':
			draw_newPath(JSON.parse(data.substring(1)));
			break;
		case '4':
			draw_continuePath(JSON.parse(data.substring(1)));
			break;
		case '5':
			draw_finishPath();
			break;
		case '6':
			project.activeLayer.removeChildren();
			raster = new Raster({
				source: "white.png",
				position: view.center});
			context2.clearRect(0, 0, canvas2.width, canvas2.height);
			break;
		case '7':
			currentDrawer = data.substring(1);
			
			for(var i = 0; i < users.length; i++)
				users[i].fin = 0;

			while(overlayTextContent.firstChild){
				overlayTextContent.removeChild(overlayTextContent.firstChild);
			}

			if(currentDrawer == myid){
				toolsContainer.style.display = "flex";
				overlayTextHeader.textContent = "Pick a word.";
			}else{
				wordchoices.style.display = "none";
				overlay.style.display = "inline";
				for(var i = 0; i < users.length; i++){
					if(users[i].id == currentDrawer){
						overlayTextHeader.textContent = users[i].name + " is picking a word.";
					}
				}
				toolsContainer.style.display = "none";
			}

			refreshUserList();
			break;
		case '8':
			timeLeft.textContent = data.substring(1);
			break;
		case '9':
			overlayTextHeader.textContent = "";
			var words = JSON.parse(data.substring(1));
			wordchoice1.textContent = words[0];
			wordchoice2.textContent = words[1];
			wordchoice3.textContent = words[2];
			overlay.style.display = "inline";
			wordchoices.style.display = "flex";
			break;
		case 'a':
			currentWord.textContent = data.substring(1);
			break;
		case 'b':
			overlay.style.display = "inline";
			overlayTextHeader.textContent = "The correct word was " + data.substring(1, data.indexOf("/"));
			addToChat('s', "The correct word was " + data.substring(1, data.indexOf("/")),1);

			var scores = JSON.parse(data.substring(data.indexOf("/") + 1));

			while(overlayTextContent.firstChild){
				overlayTextContent.removeChild(overlayTextContent.firstChild);
			}
			
			for(var i = 0; i < scores.length; i++){
				var sc = overlayTextTemplate.cloneNode(true);
				sc.removeAttribute('id');
				var name;
				for(var j = 0; j < users.length; j++){
					if(users[j].id == scores[i].id)
						name = users[j].name
				}
				sc.children[0].textContent = name;
				sc.children[1].textContent = scores[i].score;

				overlayTextContent.appendChild(sc);
			}
			break;
		case 'c':
			var tab = JSON.parse(data.substring(1));
			for(var i = 0; i < tab.length; i++){
				parse(tab[i]);
			}
			break;
		case 'd':
			overlay.style.display = "none";
			overlayTextHeader.textContent = "";
			project.activeLayer.removeChildren();
			raster = new Raster({
				source: "white.png",
				position: view.center});
			context2.clearRect(0, 0, canvas2.width, canvas2.height);
			break;
		case 'e':
			for(var i = 0; i < users.length; i++){
				if(users[i].id == data.substring(1)){
					users[i].fin = 1;
					addToChat('s', users[i].name + " has guessed correctly", 2);
				}
			}
			refreshUserList();
			break;
		case 'A':
			var user = JSON.parse(data.substring(1));
			users.push(user);
			refreshUserList();
			addToChat('s', user.name + " has joined.", 2);
			break;
		case 'B':
			for(var i = 0; i < users.length; i++){
				if(users[i].id == data.substring(1)){
					addToChat('s', users[i].name + " has left.", 3);
					users.splice(i,1);
				}
			}
			refreshUserList();
			break;
		default:
			break;
	}
}

var myid = -1;
var currentDrawer = -2;
var connection;
formConnect.onsubmit = function(e){
	
	e.preventDefault();
	
	formBtnConnect.disabled = true;
	connection = new WebSocket('ws://' + formFieldServerHost.value);

	console.log(formFieldServerHost.value);

	connection.onopen = function(event){
		connectDialog.style.display = "none";
		connection.send("0"+formFieldNickname.value);
	}
	
	connection.onmessage = function(event){
		parse(event.data);
	}

	connection.onerror = function(event){
		formBtnConnect.disabled = false;
	}

	connection.onclose = function(event){
		formBtnConnect.disabled = false;
		connectDialog.style.display = "block";
	}
	
	return false;	
}

wordchoice1.onclick = function(){
	connection.send("70");
	currentWord.textContent = wordchoice1.textContent;
	overlay.style.display = "none";
	wordchoices.style.display = "none";
	project.activeLayer.removeChildren();
	raster = new Raster({
		source: "white.png",
		position: view.center});
	context2.clearRect(0, 0, canvas2.width, canvas2.height);
}

wordchoice2.onclick = function(){
	connection.send("71");
	currentWord.textContent = wordchoice2.textContent;
	overlay.style.display = "none";
	wordchoices.style.display = "none";
	project.activeLayer.removeChildren();
	raster = new Raster({
		source: "white.png",
		position: view.center});
	context2.clearRect(0, 0, canvas2.width, canvas2.height);
}

wordchoice3.onclick = function(){
	connection.send("72");
	currentWord.textContent = wordchoice3.textContent;
	overlay.style.display = "none";
	wordchoices.style.display = "none";
	project.activeLayer.removeChildren();
	raster = new Raster({
		source: "white.png",
		position: view.center});
	context2.clearRect(0, 0, canvas2.width, canvas2.height);
}

toolBrush.onclick = function(){
	activeTool = 1;
	this.style.backgroundColor = "lightgray";
	toolFill.style.backgroundColor = "white";
}

toolFill.onclick = function(){
	activeTool = 2;
	this.style.backgroundColor = "lightgray";
	toolBrush.style.backgroundColor = "white";
}

toolClear.onclick = function(){
	connection.send("6");
	project.activeLayer.removeChildren();
	raster = new Raster({
		source: "white.png",
		position: view.center});
	context2.clearRect(0, 0, canvas2.width, canvas2.height);
}

for(var i = 0; i < document.getElementsByClassName("color").length; i++){
	var elem = document.getElementsByClassName("color")[i];
	elem.onclick = function(){
		previewColor.style.backgroundColor = this.style.backgroundColor;
		activeColor = this.style.backgroundColor;
	}
}

toolDownload.onclick = function(){
    var link = document.createElement("a");

    link.setAttribute("href", raster.toDataURL());
    link.setAttribute("download", new Date().getTime());
    link.click();
}