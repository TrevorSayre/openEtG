"use strict";
var px = require("./px");
var etg = require("./etg");
var gfx = require("./gfx");
var ui = require("./uiutil");
var chat = require("./chat");
var sock = require("./sock");
var Cards = require("./Cards");
var etgutil = require("./etgutil");
var options = require("./options");
module.exports = function(arena, acard, startempty) {
	if (!Cards.loaded) return;
	if (arena && (!sock.user || arena.deck === undefined || acard === undefined)) arena = false;
	function updateField(renderdeck){
		if (deckimport){
			deckimport.value = etgutil.encodedeck(decksprite.deck) + "01" + etg.toTrueMark(editormark);
			deckimport.dispatchEvent(new Event("change"));
		}
	}
	function sumCardMinus(cardminus, code){
		var sum = 0;
		for (var i=0; i<2; i++){
			for (var j=0; j<2; j++){
				sum += cardminus[etgutil.asShiny(etgutil.asUpped(code, i==0), j==0)] || 0;
			}
		}
		return sum;
	}
	function processDeck() {
		for (var i = decksprite.deck.length - 1;i >= 0;i--) {
			if (!(decksprite.deck[i] in Cards.Codes)) {
				var index = etg.fromTrueMark(decksprite.deck[i]);
				if (~index) {
					editormark = index;
				}
				decksprite.deck.splice(i, 1);
			}
		}
		editormarksprite.setTexture(gfx.eicons[editormark]);
		if (decksprite.deck.length > 60) decksprite.deck.length = 60;
		decksprite.deck.sort(etg.cardCmp);
		if (sock.user) {
			cardminus = {};
			for (var i = decksprite.deck.length - 1;i >= 0;i--) {
				var code = decksprite.deck[i], card = Cards.Codes[code];
				if (card.type != etg.PillarEnum) {
					if (sumCardMinus(cardminus, code) == 6) {
						decksprite.deck.splice(i, 1);
						continue;
					}
				}
				if (!card.isFree()) {
					if ((cardminus[code] || 0) < (cardpool[code] || 0)) {
						px.adjust(cardminus, code, 1);
					} else {
						code = etgutil.asShiny(code, !card.shiny);
						card = Cards.Codes[code];
						if (card.isFree()){
							decksprite.deck[i] = code;
						}else if ((cardminus[code] || 0) < (cardpool[code] || 0)) {
							decksprite.deck[i] = code;
							px.adjust(cardminus, code, 1);
						} else {
							decksprite.deck.splice(i, 1);
						}
					}
				}
			}
			if (arena){
				decksprite.deck.unshift(acard, acard, acard, acard, acard);
			}
		}
		updateField();
		decksprite.renderDeck(0);
	}
	function setCardArt(code){
		cardArt.setTexture(gfx.getArt(code));
		cardArt.visible = true;
	}
	function incrpool(code, count){
		if (code in Cards.Codes && (!arena || (!Cards.Codes[code].isOf(Cards.Codes[acard].asUpped(false).asShiny(false))) && (arena.lv || !Cards.Codes[code].upped))){
			if (code in cardpool) {
				cardpool[code] += count;
			} else {
				cardpool[code] = count;
			}
		}
	}
	function saveDeck(force){
		var dcode = etgutil.encodedeck(decksprite.deck) + "01" + etg.toTrueMark(editormark);
		var olddeck = sock.getDeck();
		if (decksprite.deck.length == 0){
			sock.userEmit("rmdeck", {name: sock.user.selectedDeck});
			delete sock.user.decknames[sock.user.selectedDeck];
		}else if (olddeck != dcode){
			sock.user.decknames[sock.user.selectedDeck] = dcode;
			sock.userEmit("setdeck", { d: dcode, name: sock.user.selectedDeck });
		}else if (force) sock.userEmit("setdeck", {name: sock.user.selectedDeck });
	}
	function loadDeck(x){
		if (!x) return;
		saveDeck();
		deckname.value = sock.user.selectedDeck = x;
		tname.setText(x);
		for (var i = 0;i < 10;i++) buttons[i].style.display = sock.user.selectedDeck !== i.toString() ? "inline" : "none";
		decksprite.deck = etgutil.decodedeck(sock.getDeck());
		processDeck();
	}
	function importDeck(){
		var dvalue = options.deck.trim();
		decksprite.deck = ~dvalue.indexOf(" ") ? dvalue.split(" ") : etgutil.decodedeck(dvalue);
		processDeck();
	}
	var cardminus, cardpool;
	if (sock.user){
		cardminus = {};
		cardpool = {};
		etgutil.iterraw(sock.user.pool, incrpool);
		etgutil.iterraw(sock.user.accountbound, incrpool);
	}
	var editorui = px.mkView(), dom = [[8, 32, ["Clear", function(){
		if (sock.user) {
			cardminus = {};
		}
		decksprite.deck.length = arena?5:0;
		decksprite.renderDeck(decksprite.deck.length);
	}]]];
	function sumscore(){
		var sum = 0;
		for(var k in artable){
			sum += arattr[k]*artable[k].cost;
		}
		return sum;
	}
	function makeattrui(y, name){
		y = 128+y*20;
		var data = artable[name];
		var bt = new PIXI.Text(name, ui.mkFont(16, "black"));
		bt.position.set(8, y);
		var bm = px.mkButton(50, y, ui.getTextImage("-", ui.mkFont(16, "black"), 0xFFFFFFFF));
		var bv = new PIXI.Text(arattr[name], ui.mkFont(16, "black"));
		bv.position.set(64, y);
		var bp = px.mkButton(90, y, ui.getTextImage("+", ui.mkFont(16, "black"), 0xFFFFFFFF));
		function modattr(x){
			arattr[name] += x;
			if (arattr[name] >= (data.min || 0) && (!data.max || arattr[name] <= data.max)){
				var sum = sumscore();
				if (sum <= arpts){
					bv.setText(arattr[name]);
					curpts.setText((arpts-sum)/45);
					return;
				}
			}
			arattr[name] -= x;
		}
		px.setClick(bm, modattr.bind(null, -(data.incr || 1)));
		px.setClick(bp, modattr.bind(null, data.incr || 1));
		editorui.addChild(bt);
		editorui.addChild(bm);
		editorui.addChild(bv);
		editorui.addChild(bp);
	}
	function switchDeckCb(x){
		return function() {
			loadDeck(x.toString());
		}
	}
	var buttons;
	if (arena){
		dom.push([8, 58, ["Save & Exit", function() {
			if (decksprite.deck.length < 35) {
				chat("35 cards required before submission");
				return;
			}
			var data = { d: etgutil.encodedeck(decksprite.deck.slice(5)) + "01" + etg.toTrueMark(editormark), lv: arena.lv };
			for(var k in arattr){
				data[k] = arattr[k];
			}
			if (!startempty){
				data.mod = true;
			}
			sock.userEmit("setarena", data);
			chat("Arena deck submitted");
			startMenu();
		}]], [8, 84, ["Exit", function() {
			require("./ArenaInfo")(arena);
		}]]);
		var arpts = arena.lv?515:470, arattr = {hp:parseInt(arena.hp || 200), mark:parseInt(arena.mark || 1), draw:parseInt(arena.draw || 1)};
		var artable = {
			hp: { min: 65, max: 200, incr: 45, cost: 1 },
			mark: { cost: 45 },
			draw: { cost: 135 },
		};
		var curpts = new PIXI.Text((arpts-sumscore())/45, ui.mkFont(16, "black"));
		curpts.position.set(8, 188);
		editorui.addChild(curpts);
		makeattrui(0, "hp");
		makeattrui(1, "mark");
		makeattrui(2, "draw");
	}else{
		dom.push([8, 58, ["Save & Exit", function() {
			if (sock.user) saveDeck(true);
			startMenu();
		}]], [8, 84, ["Import", importDeck]]);
		if (sock.user) {
			dom.push([8, 110, ["Save", function() {
				if (deckname.value){
					sock.user.selectedDeck = deckname.value;
					for (var i = 0;i < 10;i++) buttons[i].style.display = sock.user.selectedDeck == i ? "none": "inline";
					tname.setText(sock.user.selectedDeck);
					saveDeck();
				}
			}]], [8, 136, ["Load", function() {
				loadDeck(deckname.value);
			}]], [8, 162, ["Exit", function() {
				startMenu();
			}]])
			var tname = new px.MenuText(100, 8, sock.user.selectedDeck);
			editorui.addChild(tname);
			buttons = [];
			for (var i = 0;i < 10;i++) {
				var b = document.createElement("input");
				b.type = "button";
				b.style.width = "32px";
				b.value = i.toString();
				b.style.backgroundSize = "100% 100%";
				b.addEventListener("click", switchDeckCb(i));
				dom.push([300 + i*36, 8, b]);
				buttons.push(b);
			}
			if (sock.user.selectedDeck.match(/^\d$/)) buttons[sock.user.selectedDeck].style.display = "none";
		}
	}
	var editormarksprite = new PIXI.Sprite(gfx.nopic);
	editormarksprite.position.set(66, 200);
	editorui.addChild(editormarksprite);
	var editormark = 0;
	for (var i = 0;i < 13;i++) {
		var sprite = px.mkButton(100 + i * 32, 234, gfx.eicons[i]);
		sprite.interactive = true;
		(function(_i) {
			px.setClick(sprite, function() {
				editormark = _i;
				editormarksprite.setTexture(gfx.eicons[_i]);
				updateField();
			});
		})(i);
		editorui.addChild(sprite);
	}
	var decksprite = new px.DeckDisplay(60, setCardArt,
		function(i){
			var code = decksprite.deck[i], card = Cards.Codes[code];
			if (!arena || code != acard){
				if (sock.user && !card.isFree()) {
					px.adjust(cardminus, code, -1);
				}
				decksprite.rmCard(i);
				updateField();
			}
		}, arena ? (startempty ? [] : etgutil.decodedeck(arena.deck)) : etgutil.decodedeck(sock.getDeck())
	);
	editorui.addChild(decksprite);
	var cardsel = new px.CardSelector(setCardArt,
		function(code){
			if (decksprite.deck.length < 60) {
				var card = Cards.Codes[code];
				if (sock.user && !card.isFree()) {
					if (!(code in cardpool) || (code in cardminus && cardminus[code] >= cardpool[code]) ||
						(card.type != etg.PillarEnum && sumCardMinus(cardminus, code) >= 6)) {
						return;
					}
					px.adjust(cardminus, code, 1);
				}
				decksprite.addCard(code, arena?5:0);
				updateField();
			}
		}, !arena, !!cardpool
	);
	editorui.addChild(cardsel);
	var cardArt = new PIXI.Sprite(gfx.nopic);
	cardArt.position.set(734, 8);
	editorui.addChild(cardArt);
	if (!arena){
		if (sock.user){
			var deckname = document.createElement("input");
			deckname.id = "deckname";
			deckname.style.width = "80px";
			deckname.placeholder = "Name";
			deckname.value = sock.user.selectedDeck;
			deckname.addEventListener("keydown", function(e){
				if (e.keyCode == 13) {
					loadDeck(this.value);
				}
			});
			deckname.addEventListener("click", function(e){
				this.setSelectionRange(0, 99);
			});
			dom.push([4, 4, deckname]);
		}
		var deckimport = document.createElement("input");
		deckimport.id = "deckimport";
		deckimport.style.width = "190px";
		deckimport.style.height = "20px";
		deckimport.placeholder = "Deck";
		deckimport.addEventListener("click", function(){this.setSelectionRange(0, 333)});
		deckimport.addEventListener("keydown", function(e){
			if (e.keyCode == 13){
				this.blur();
				importDeck();
			}
		});
		options.register("deck", deckimport);
		dom.push([520, 238, deckimport]);
	}
	px.refreshRenderer({view:editorui, editdiv:dom, next:function() {
		cardArt.visible = false;
		var mpos = px.getMousePos();
		cardsel.next(cardpool, cardminus, mpos);
		decksprite.next(mpos);
	}});
	if (!arena){
		deckimport.focus();
		deckimport.setSelectionRange(0, 333);
	}
	processDeck();
}
var startMenu = require("./MainMenu");