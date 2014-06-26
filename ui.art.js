var Actives = require("./Actives")
loadcards(function(Cards, CardCodes, Targeting) {
	var credits = [
		[["andretimpa", "http://andretimpa.deviantart.com/"],["Element Icons", "assets/esheet.png"],["4sa", "4si", "4sk", "55s", "4sn", "4so", "4sp", "4sq", "4ss", "4st", "4su", "4vr", "6ub"]],
		[["dawn to dusk", "http://elementscommunity.org/forum//index.php?action=profile;u=5119"],["53e", "5fu", "5j2", "5m6"]],
		[["pepokish","http://theowlettenest.com"],["52g", "5f0", "5oj", "5l8", "5bv", "5lb", "5ie", "58o", "5i4"]],
		[["serprex","http://fiction.wikia.com/wiki/User:Serprex"],["622"]],
		[["vrt","http://vrt-designs.com"],["Donation thread","http://elementscommunity.org/forum/card-art/help-support-an-artist"],
			["5ll", "52t", "5v3", "5ul", "61t", "562", "5um", "5uk", "591", "5rt", "61o", "5ij", "5rs", "624", "4vc", "55r", "626", "4vh", "5uv", "5fc", "5oc", "5c1", "560", "563", "625", "4ve", "5i5", "5ut", "5rk", "5i7", "55o", "5c9", "55l", "5f2"]],
		[["willowdream","http://willowdream.carbonmade.com"],["5od", "5oe", "5ok", "5oo", "5os", "5p0"]],
		[["Ravizant","http://elementscommunity.org/forum/profile/?u=8037"],["Element Icons", "assets/esheet.png"], ["Card Backgrounds", "assets/backsheet.png"],
			["4sc", "50u", "4vi", "4vj", "4vq", "50a", "4vt", "4vu", "542", "53e", "576", "55q", "564", "55v", "56i", "599", "59m", "58q", "5de", "5cb", "5cq", "5ce", "5c3", "5cg", "5gi", "5f3", "5fi", "5fu", "5jm", "5ia", "5j2", "5l9", "5mq", "5m6", "5pu", 
			"5pa", "5ou", "5t2", "5se", "5vi", "5uq", "5uu", "61p", "61q", "620", "62m", "627", "61v", "6u3", "77p", "77a", "7au", "7dj", "7e2", "7ta", "809", "80a","5cf", "7av","5fd"]],
		[["jarozaoz", "http://elementscommunity.org/forum/profile/?u=6364"], ["4t3", "4vn", "500", "532", "52s", "534", "55k", "568", "59c", "5ff", "5fk", "5fe", "5io", "5le", "5lf", "5ls", "5la", "5li", "5oq", "5op", "5rh", "5s4", "5v8", "62c"]]
	var str = "<br>";
	for(var i=0; i<credits.length; i++){
		var credit = credits[i];
		for(var j=0; j<credit.length-1; j++){
			str += "<a href='"+credit[j][1]+"'>"+credit[j][0]+"</a>&emsp;";
		}
		var codes = credit[credit.length-1];
		if (codes.length){
			codes.sort();
			str += "<table><tr>";
			for(var j=0; j<codes.length; j++){
				var code=codes[j];
				str += "<td><a href='Cards/"+code+".png' onmouseover='document.getElementById(\"codeimg\").src=\"Cards/"+code+".png\"'>"+CardCodes[code].name+"</a></td>";
				if ((j&7)==7)str += "</tr><tr>";
			}
			str += "</tr></table><br>";
		}else str += "<br><br>";
	}
	codecreds.innerHTML = str;
});