#!/usr/bin/node
process.chdir(__dirname);
"use strict";
var users = {}, usersock = {}, rooms = {}, sockinfo = {};
var sutil = require("./srv/sutil");
sutil.loadcards();
var qstring = require("querystring");
var crypto = require("crypto");
var fs = require("fs");
var db = require("redis").createClient();
var app = require("connect")().
	use(require("compression")()).
	use(require("serve-static")(__dirname)).
	use("/Cards", require("./srv/cardredirect")()).
	use("/speed", require("./srv/speed")()).
	use("/deck", require("./srv/deckredirect")()).
	use("/auth", require("./srv/loginauth")(db, users)).
	use("/code", require("./srv/codesmith")(db));
var io = require("engine.io")(app.listen(13602));
var etgutil = require("./etgutil");
var userutil = require("./userutil");
var etg = require("./etg");
var aiDecks = require("./Decks");
var Cards = require("./Cards");
function storeUsers(){
	for(var u in users){
		var user = users[u];
		if (user.pool || user.accountbound){
			db.hmset("U:"+u, user);
		}
	}
}
setInterval(function(){
	storeUsers();
	// Clear inactive users
	for(var u in users){
		if (!(u in usersock)){
			delete users[u];
		}else if (usersock[u].readyState == "closed"){
			delete usersock[u];
			delete users[u];
		}
	}
}, 300000);
process.on("SIGTERM", process.exit).on("SIGINT", process.exit);
process.on("exit", function(){
	storeUsers();
	db.quit();
});
function activeUsers() {
	var activeusers = [];
	for (var username in usersock) {
		var sock = usersock[username];
		if (sock && sock.readyState == "open"){
			if (sock.id in sockinfo){
				if (sockinfo[sock.id].showoffline) continue;
				if (sockinfo[sock.id].wantingpvp) username += "\xb6";
			}
			activeusers.push(username);
		}
	}
	return activeusers;
}
function genericChat(socket, data){
	data.x = "chat";
	var msg = JSON.stringify(data);
	for (var id in io.clients){
		io.clients[id].send(msg);
	}
}
function getAgedHp(hp, age){
	var curhp = age > 1 ? hp - (1<<Math.min(age, 9)-1) : hp;
	return Math.max(curhp, Math.floor(hp/4));
}
function wilson(up, total) {
	// from npm's wilson-score
	var z = 2.326348;
	if (total <= 0 || total < up) return 0;
	var phat = up/total, z2 = z*z;
	return (phat + z2/(2*total) - z*Math.sqrt((phat*(1 - phat) + z2/(4*total))/total))/(1 + z2/total);
}
function sockEmit(socket, event, data){
	if (!data) data = {};
	data.x = event;
	socket.send(JSON.stringify(data));
}
var echoEvents = { endturn: true, cast: true, foeleft: true, mulligan: true, cardchosen: true };
var userEvents = {
	usernop:function(){},
	inituser:function(data, user) {
		var starters = [
			"015990g4sa014sd014t4014vi014vs0152o0152t0155u0155p0158q015ca015fi015f6015if015il015lo015lb015ou015s5025rq015v3015ut0161s018pi",
			"01502034sa014t3014sd0b4vc024vi014vj014vh014vv014vp034vs024vd014ve014vf055uk015us015v3015uq015up015uv018pt",
			"0153102532034sa014sd014t40c52g0252i0252j0252k0252n0152p0152t0152r0152h045bs025cb025cr018pn",
			"0156203564025650159502599034sa014sd014t50b55k0155q0255t0255r0255l0155o0458o0158t0258q018pm",
			"03590015910159403599034sa014sd014t40b58o0258u0158p0258q0158s0158r045rg025ri025rr015rn018ps",
			"034sa014sd014td0c5bs015bu025c1015cb025c0015c8025c7015c6015cr015c3015bt045i4015ia015i6025il025ie018ps",
			"034sa014sd024t40b5f0025f1025f3015f4025fh025fi025fa015f5025fc015f2045l8025lp025lr018pq",
			"02565034sa024sd014td0455k0255t0155r0c5i4025i8035i6025ip025ie015i9025ig015id018pl",
			"034sa014sd014tb0b5l8025lo025lp035lb015ld025lm015ln025ll015la045oc025on025os015oe015or018pr",
			"034sa014sd014t4055f0015f3025f4015f6015fc0c5oc025od015og025os015oh015oe025ou015om025or015of018po",
			"03627034sa024sd014t40c5rg025ri025rr015rl025ru015s0015rn015rm0561o0261q0261t018pu",
			"034sa014sd014t40452g0152p0252t0a5uk035um025un015us025v3015uq035ut015up015vb015uo025uv015ul018pk",
			"015020262002627034sa014sd014t4064vc024vp034vs0b61o0261q0361s0261t0161v018pj",
			"",
		];
		user.accountbound = starters[data.e];
		user.oracle = 0;
		user.pool = "";
		user.freepacks = data.e == 13 ? "6,6,0,0" : "3,2,0,0";
		user.dailymage = Math.floor(Math.random() * aiDecks.mage.length);
		user.dailydg = Math.floor(Math.random() * aiDecks.demigod.length);
		var socket = this;
		db.hset("D:"+data.u, "0", starters[data.e], function(err){
			sutil.useruser(db, user, function(clientuser){
				sockEmit(socket, "userdump", clientuser);
			});
		});
	},
	logout:function(data, user) {
		var u=data.u;
		db.hmset("U:"+u, user);
		delete users[u];
		delete usersock[u];
	},
	delete:function(data, user) {
		var u = data.u;
		db.del("U:" + u);
		db.del("Q:" + u);
		db.del("D:" + u);
		delete users[u];
		delete usersock[u];
	},
	setdeck:function(data, user) {
		if (data.d !== undefined) {
			db.hset("D:"+user.name, data.name, data.d);
		}
		user.selectedDeck = data.name || data.number;
	},
	rmdeck:function(data, user){
		db.hdel("D:"+user.name, data.name);
	},
	setarena:function(data, user){
		if (!user.ocard || !data.d){
			return;
		}
		var au=(data.lv?"B:":"A:") + data.u;
		if (data.mod){
			db.hmset(au, {deck: data.d, hp: data.hp, draw: data.draw, mark: data.mark});
		}else{
			db.hmset(au, {day: sutil.getDay(), deck: data.d, card: user.ocard, win:0, loss:0, hp: data.hp, draw: data.draw, mark: data.mark});
			db.zadd("arena"+(data.lv?"1":""), 200, data.u);
		}
	},
	arenainfo:function(data, user){
		var socket = this;
		db.hgetall((data.lv?"B:":"A:") + data.u, function(err, obj){
			if (!obj){
				sockEmit(socket, "arenainfo", {deck:"", lv: data.lv});
			}else{
				db.zrevrank("arena"+(data.lv?"1":""), data.u, function(err, rank){
					obj.day = sutil.getDay() - obj.day;
					obj.curhp = getAgedHp(obj.hp, obj.day);
					obj.lv = data.lv;
					if (rank !== null)obj.rank = rank;
					sockEmit(socket, "arenainfo", obj);
				});
			}
		});
	},
	modarena:function(data, user){
		if (data.aname in users){
			users[data.aname].gold += data.won?3:1;
		}else{
			db.exists("U:"+data.aname, function(err, exists){
				if (exists){
					db.hincrby("U:"+data.aname, "gold", data.won?3:1);
				}
			});
		}
		var arena = "arena"+(data.lv?"1":""), akey = (data.lv?"B:":"A:")+data.aname;
		db.zscore(arena, function(err, score){
			if (score === null) return;
			db.hincrby(akey, data.won?"win":"loss", 1, function(err){
				db.hmget(akey, "win", "loss", "day", function(err, wld){
					if (err || !wld) return;
					for(var i=0; i<3; i++) wld[i] = parseInt(wld[i]);
					if (!data.won && (score < 15 || wld[0]-wld[1] < -15 || sutil.getDay()-wld[2] > 14)){
						db.zrem(arena, data.aname);
					}else{
						db.zadd(arena, wilson(wld[0]+1, wld[0]+wld[1]+1)*1000, data.aname);
					}
				});
			});
		});
	},
	foearena:function(data, user){
		var socket = this;
		db.zcard("arena"+(data.lv?"1":""), function(err, len){
			if (!len)return;
			var cost = userutil.arenaCost(data.lv);
			if (user.gold < cost)return;
			user.gold -= cost;
			var idx = etg.PlayerRng.upto(Math.min(len, 20));
			db.zrevrange("arena"+(data.lv?"1":""), idx, idx, function(err, aname){
				if (!aname || !aname.length){
					console.log("No arena " + idx);
					return;
				}
				aname = aname[0];
				console.log("deck: "+ aname + " " + idx);
				db.hgetall((data.lv?"B:":"A:")+aname, function(err, adeck){
					var seed = Math.random();
					if (data.lv) adeck.card = etgutil.asUpped(adeck.card, true);
					adeck.hp = parseInt(adeck.hp || 200);
					adeck.mark = parseInt(adeck.mark || 1);
					adeck.draw = parseInt(adeck.draw || data.lv+1);
					var curhp = getAgedHp(adeck.hp, sutil.getDay()-adeck.day);
					sockEmit(socket, "foearena", {
						seed: seed*etgutil.MAX_INT,
						name: aname, hp: curhp,
						mark: adeck.mark, draw: adeck.draw,
						deck: adeck.deck + "05" + adeck.card, lv:data.lv});
				});
			});
		});
	},
	codesubmit:function(data, user){
		var socket = this;
		db.hget("CodeHash", data.code, function(err, type){
			if (!type){
				sockEmit(socket, "chat", { mode: "red", msg: "Code does not exist"});
			}else if (type.charAt(0) == "G"){
				var g = parseInt(type.slice(1));
				if (isNaN(g)){
					sockEmit(socket, "chat", { mode: "red", msg: "Invalid gold code type: " + type});
				}else{
					user.gold += g;
					sockEmit(socket, "codegold", {g: g});
					db.hdel("CodeHash", data.code);
				}
			}else if (type.charAt(0) == "C"){
				var c = type.slice(1);
				if (c in Cards.Codes){
					user.pool = etgutil.addcard(user.pool, c);
					sockEmit(socket, "codecode", {card: c});
					db.hdel("CodeHash", data.code);
				}else sockEmit(socket, "chat", { mode: "red", msg: "Unknown card: " + type});
			}else if (type in userutil.rewardwords){
				sockEmit(socket, "codecard", {type: type});
			}else{
				sockEmit(socket, "chat", { mode: "red", msg: "Unknown code type: " + type});
			}
		});
	},
	codesubmit2:function(data, user){
		var socket = this;
		db.hget("CodeHash", data.code, function(err, type){
			if (!type){
				sockEmit(socket, "chat", { mode: "red", msg: "Code does not exist"});
			}else if (type in userutil.rewardwords){
				var card = Cards.Codes[data.card];
				if (card && card.rarity == userutil.rewardwords[type]){
					user.pool = etgutil.addcard(user.pool, data.card);
					sockEmit(socket, "codedone", {card: data.card});
					db.hdel("CodeHash", data.code);
				}
			}else{
				sockEmit(socket, "chat", { mode: "red", msg: "Unknown code type: " + type});
			}
		});
	},
	foewant:function(data, user){
		var u=data.u, f=data.f, socket = this;
		if (u == f){
			return;
		}
		console.log(u + " requesting " + f);
		db.hget("D:"+u, user.selectedDeck, function(err, deck){
			if (!deck) return;
			sockinfo[socket.id].deck = deck;
			sockinfo[socket.id].pvpstats = { hp: data.p1hp, markpower: data.p1markpower, deckpower: data.p1deckpower, drawpower: data.p1drawpower };
			var foesock = usersock[f];
			if (foesock && foesock.id in sockinfo){
				if (sockinfo[foesock.id].duel == u) {
					delete sockinfo[foesock.id].duel;
					var seed = Math.random() * etgutil.MAX_INT;
					sockinfo[socket.id].foe = foesock;
					sockinfo[foesock.id].foe = socket;
					var deck0 = sockinfo[foesock.id].deck, deck1 = sockinfo[socket.id].deck;
					var owndata = { seed: seed, deck: deck0, urdeck: deck1, foename:f };
					var foedata = { flip: true, seed: seed, deck: deck1, urdeck: deck0 ,foename:u };
					var stat = sockinfo[socket.id].pvpstats, foestat = sockinfo[foesock.id].pvpstats;
					for (var key in stat) {
						owndata["p1" + key] = stat[key];
						foedata["p2" + key] = stat[key];
					}
					for (var key in foestat) {
						owndata["p2" + key] = foestat[key];
						foedata["p1" + key] = foestat[key];
					}
					sockEmit(socket, "pvpgive", owndata);
					sockEmit(foesock, "pvpgive", foedata);
				} else {
					sockinfo[socket.id].duel = f;
					sockEmit(foesock, "challenge", { f:u, pvp:true });
				}
			}
		});
	},
	canceltrade:function (data, user) {
		var info = sockinfo[this.id];
		if (info.trade){
			var foesock = usersock[info.trade.foe];
			if (foesock){
				sockEmit(foesock, "tradecanceled");
				sockEmit(foesock, "chat", { mode: "red", msg: data.u + " has canceled the trade."});
				if (foesock.id in sockinfo){
					delete sockinfo[foesock.id].trade;
				}
			}
			delete info.trade;
		}
	},
	confirmtrade:function (data, user) {
		var u = data.u, thistrade = sockinfo[this.id].trade;
		if (!thistrade){
			return;
		}
		thistrade.tradecards = data.cards;
		thistrade.oppcards = data.oppcards;
		var thatsock = usersock[thistrade.foe];
		var thattrade = thatsock && sockinfo[thatsock.id] && sockinfo[thatsock.id].trade;
		var otherUser = users[thistrade.foe];
		if (!thattrade || !otherUser){
			sockEmit(this, "tradecanceled");
			delete sockinfo[this.id].trade;
			return;
		} else if (thattrade.accepted) {
			var player1Cards = thistrade.tradecards, player2Cards = thattrade.tradecards;
			if (player1Cards != thattrade.oppcards || player2Cards != thistrade.oppcards){
				sockEmit(this, "tradecanceled");
				sockEmit(this, "chat", { mode: "red", msg: "Trade disagreement."});
				sockEmit(thatsock, "tradecanceled");
				sockEmit(thatsock, "chat", { mode: "red", msg: "Trade disagreement."});
				return;
			}
			user.pool = etgutil.removedecks(user.pool, player1Cards);
			user.pool = etgutil.mergedecks(user.pool, player2Cards);
			otherUser.pool = etgutil.removedecks(otherUser.pool, player2Cards);
			otherUser.pool = etgutil.mergedecks(otherUser.pool, player1Cards);
			sockEmit(this, "tradedone", { oldcards: player1Cards, newcards: player2Cards });
			sockEmit(thatsock, "tradedone", { oldcards: player2Cards, newcards: player1Cards });
			delete sockinfo[this.id].trade;
			delete sockinfo[thatsock.id].trade;
		} else {
			thistrade.accepted = true;
		}
	},
	tradewant:function (data) {
		var u = data.u, f = data.f;
		if (u == f) {
			return;
		}
		console.log(u + " requesting " + f);
		var foesock = usersock[f];
		if (foesock && foesock.id in sockinfo) {
			sockinfo[this.id].trade = {foe: f};
			var foetrade = sockinfo[foesock.id].trade;
			if (foetrade && foetrade.foe == u) {
				sockEmit(this, "tradegive");
				sockEmit(foesock, "tradegive");
			} else {
				sockEmit(foesock, "challenge", {f:u});
			}
		}
	},
	passchange:function(data, user){
		var pass = data.p || "";
		if (!pass.length){
			var hkey = "U:"+user.name;
			db.hdel(hkey, "salt");
			db.hdel(hkey, "iter");
			db.hset(hkey, "auth", user.name);
			delete user.salt;
			delete user.iter;
			user.auth = user.name;
			sockEmit(this, "passchange", {auth: user.name});
		}else{
			var socket = this;
			crypto.pbkdf2(pass, user.salt, parseInt(user.iter), 64, function(err, key){
				if (!err){
					user.auth = key.toString("base64");
					sockEmit(socket, "passchange", {auth: user.auth});
				}
			});
		}
	},
	chat:function (data) {
		if (data.to) {
			var to = data.to;
			if (usersock[to]) {
				sockEmit(usersock[to], "chat", { msg: data.msg, mode: "blue", u: data.u });
				sockEmit(this, "chat", { msg: data.msg, mode: "blue", u: "To " + to });
			}
			else sockEmit(this, "chat", { mode: "red", msg: to + " is not here right now." });
		}
		else{
			delete data.a;
			genericChat(this, data);
		}
	},
	updatequest:function (data, user) {
		db.hset("Q:" + data.u, data.quest, data.newstage);
	},
	booster:function(data, user) {
		var freepacklist, bound;
		var pack = [
			{ amount: 10, cost: 15, rare: []},
			{ amount: 6, cost: 25, rare: [3]},
			{ amount: 8, cost: 60, rare: [3, 7]},
			{ amount: 9, cost: 100, rare: [4, 7, 8]},
			{ amount: 1, cost: 250, rare: [0, 0, 0, 0]},
		][data.pack];
		if (!pack) return;
		var bumprate = .45/pack.amount;
		if (user.freepacks){
			freepacklist = user.freepacks.split(",");
			if (freepacklist[data.pack] > 0) bound = true;
		}
		if (!bound && data.bulk){
			pack.amount *= data.bulk;
			pack.cost *= data.bulk;
			for(var i=0; i<pack.rare.length; i++) pack.rare[i] *= data.bulk;
		}
		if (bound || user.gold >= pack.cost) {
			var newCards = "", rarity = 1;
			for (var i = 0;i < pack.amount;i++) {
				while (i == pack.rare[rarity-1]) rarity++;
				var cardcode;
				if (rarity == 5){
					cardcode = etg.NymphList[data.element > 0 && data.element < 13 ? data.element : etg.PlayerRng.uptoceil(12)];
				}else{
					var notFromElement = Math.random() > .5, bumprarity = rarity+(Math.random() < bumprate), card = undefined;
					if (data.element < 13) card = etg.PlayerRng.randomcard(false, function(x) { return (x.element == data.element) ^ notFromElement && x.rarity == bumprarity});
					if (data.element == 14){
						var newCardList = [
							Cards.Envenom, Cards.JetStream, Cards.Salamander, Cards.Shadow, Cards.Inertia, Cards.PhaseGolem, Cards.QuantumLocket, Cards.ClockworkGolem,
							Cards.WritofVengeance, Cards.WritofVindication, Cards.JackOLantern,Cards.ThermalRecoil,Cards.GolemDefender,Cards.Shtriga, Cards.MidassTouch, Cards.Lemming,
							Cards.Fluxor, Cards.Boomstick, Cards.ShankofVoid, Cards.ScatteringWind];
						card = etg.PlayerRng.randomcard(false, function(x){ return notFromElement ^ ~newCardList.indexOf(x) && x.rarity == bumprarity});
					}
					if (!card) card = etg.PlayerRng.randomcard(false, function(x) { return x.rarity == bumprarity });
					cardcode = card.code
				}
				newCards = etgutil.addcard(newCards, cardcode);
			}
			if (bound) {
				freepacklist[data.pack]--;
				user.accountbound = etgutil.mergedecks(user.accountbound, newCards);
				if (freepacklist.every(function(x){return x == 0})) {
					db.hdel("U:" + user.name, "freepacks");
					delete user.freepacks;
				}
				else{
					user.freepacks = freepacklist.join(",");
				}
			}
			else {
				user.gold -= pack.cost;
				user.pool = etgutil.mergedecks(user.pool, newCards);
			}
			sockEmit(this, "boostergive", { cards: newCards, accountbound: bound, packtype: data.pack });
		}
	},
};
["sellcard", "upgrade", "uppillar", "polish", "shpillar", "addgold", "addloss", "addwin", "addcards", "addbound", "donedaily","unpolish","unupgrade","upshall"].forEach(function(event){
	userEvents[event] = userutil[event];
});
var sockEvents = {
	guestchat:function(data) {
		data.guest = true;
		data.u = "Guest_" + data.u;
		genericChat(this, data);
	},
	roll:function(data){
		var A = Math.min(data.A || 1, 99), X = data.X || etgutil.MAX_INT;
		delete data.A;
		delete data.X;
		var sum = 0;
		for(var i=0; i<A; i++){
			sum += etg.PlayerRng.uptoceil(X);
		}
		data.msg = A + "d" + X + " " + sum;
		data.mode = "#006000";
		genericChat(this, data);
	},
	pvpwant:function(data) {
		var pendinggame=rooms[data.room];
		console.log(this.id + ": " + (pendinggame?pendinggame.id:"-"));
		sockinfo[this.id].deck = data.deck;
		sockinfo[this.id].pvpstats = { hp: data.hp, markpower: data.mark, deckpower: data.deck, drawpower: data.draw };
		if (this == pendinggame){
			return;
		}
		if (pendinggame && pendinggame.id in sockinfo){
			var seed = Math.random()*etgutil.MAX_INT;
			sockinfo[this.id].foe = pendinggame;
			sockinfo[pendinggame.id].foe = this;
			var deck0 = sockinfo[pendinggame.id].deck, deck1 = data.deck;
			var owndata = { seed: seed, deck: deck0, urdeck: deck1};
			var foedata = { flip: true, seed: seed, deck: deck1, urdeck: deck0};
			var stat = sockinfo[this.id].pvpstats, foestat = sockinfo[pendinggame.id].pvpstats;
			for (var key in stat) {
				owndata["p1" + key] = stat[key];
				foedata["p2" + key] = stat[key];
			}
			for (var key in foestat) {
				owndata["p2" + key] = foestat[key];
				foedata["p1" + key] = foestat[key];
			}
			sockEmit(this, "pvpgive", owndata);
			sockEmit(pendinggame, "pvpgive", foedata);
			delete rooms[data.room];
		}else{
			rooms[data.room] = this;
		}
	},
	librarywant:function(data){
		if (data.f in users){
			var u = users[data.f];
			sockEmit(this, "librarygive", {pool:u.pool, bound:u.accountbound, gold:u.gold});
		}else{
			var socket = this;
			db.hmget("U:"+data.f, "pool", "accountbound", "gold", function(err, info){
				if (info) sockEmit(socket, "librarygive", {pool:info[0], bound:info[1], gold:parseInt(info[2])});
			});
		}
	},
	arenatop:function(data){
		var socket = this;
		db.zrevrange("arena"+(data.lv?"1":""), 0, 19, "withscores", function(err, obj){
			if (err) return;
			var t20 = [];
			function getwinloss(i){
				if (i == obj.length){
					sockEmit(socket, "arenatop", {top: t20});
				}else{
					db.hmget((data.lv?"B:":"A:") + obj[i], "win", "loss", "day", "card", function(err, wl){
						wl[2] = sutil.getDay()-wl[2];
						t20.push([obj[i], Math.floor(obj[i+1])].concat(wl));
						getwinloss(i+2);
					});
				}
			}
			getwinloss(0);
		});
	},
	wealthtop:function(data){
		var socket = this;
		db.zrevrange("wealth", 0, 49, "withscores", function(err, obj){
			if (!err) sockEmit(socket, "wealthtop", {top: obj});
		});
	},
	cardart:function(){
		var socket = this;
		fs.readdir(__dirname + "/Cards", function(err, files){
			if (files){
				sockEmit(socket, "cardart", {art: files.join("").replace(/\.png/g, "")});
			}
		});
	},
	showoffline:function(data){
		sockinfo[this.id].showoffline = data.hide;
	},
	wantingpvp:function(data){
		sockinfo[this.id].wantingpvp = data.want;
	},
	who:function(data){
		sockEmit(this, "chat", { mode: "red", msg: activeUsers().join(", ") || "There are no users online :(" });
	},
	challrecv:function(data){
		var foesock = usersock[data.f];
		if (foesock && foesock.id in sockinfo){
			var info = sockinfo[foesock.id], foename = data.pvp ? info.duel : info.trade ? info.trade.foe : "";
			sockEmit(foesock, "chat", { mode: "red", msg: "You have sent a " + (data.pvp ? "PvP" : "trade") + " request to " + foename + "!" });
		}
	},
};
io.on("connection", function(socket) {
	socket.on("close", function(){
		for(var key in rooms){
			if (rooms[key] == this){
				delete rooms[key];
			}
		}
		var info = sockinfo[this.id];
		if (info){
			if (info.trade){
				var foesock = usersock[info.trade.foe];
				if (foesock){
					var foeinfo = sockinfo[foesock.id];
					if (foeinfo && foeinfo.trade && usersock[foeinfo.trade.foe] == this){
						sockEmit(foesock, "tradecanceled");
						delete foeinfo.trade;
					}
				}
			}
			if (info.foe){
				var foeinfo = sockinfo[info.foe.id];
				if (foeinfo && foeinfo.foe == this){
					sockEmit(info.foe, "foeleft");
					delete foeinfo.foe;
				}
			}
			delete sockinfo[this.id];
		}
	});
	socket.on("message", function(rawdata){
		var data = JSON.parse(rawdata);
		if (!data) return;
		if (!(this.id in sockinfo)){
			sockinfo[this.id] = {};
		}
		console.log(data.u, data.x);
		if (data.x in echoEvents){
			var foe = sockinfo[this.id].trade ? usersock[sockinfo[this.id].trade.foe] : sockinfo[this.id].foe;
			if (foe){
				foe.send(rawdata);
			}
			return;
		}
		var func = userEvents[data.x];
		if (func){
			var u;
			if (!data || !(u = data.u)){
				return;
			}
			if (!(u in users)){
				if (data.x == "logout") return;
				db.hgetall("U:"+u, function(err, obj){
					if (obj){
						sutil.prepuser(obj);
						users[u] = obj;
						if (data.a == obj.auth) {
							usersock[u] = socket;
							func.call(socket, data, obj);
						}
					}
				});
			} else if (data.a == users[u].auth) {
				usersock[u] = socket;
				func.call(socket, data, users[u]);
			}
		}else if (func = sockEvents[data.x]){
			func.call(socket, data);
		}
	});
});