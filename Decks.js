"use strict";
exports.mage = [
	["The Ashes", "085f0085gi045f4045f6015f7045fb015fg025f8045fc015fe018po"],
	["The Chromatic", "0153201563015980159901627044sa044sc064vj014vh014vk0152i0155u015cc015fi015iq015il015lp015os015ri015un018pi"],
	["The Clock", "0a5rg0a5t2045rk015s1045rl015ro045ru045s0025rm018ps"],
	["The Contagion", "065420652g0452o0152q0452u0252p0252r045un045uq018pt"],
	["The Dead", "04531044vq0852g0652v0252k0452n0252p0252r018pj"],
	["The Deep", "085i4045jm015i7035ik015ia015ir045i6015il025is025i9015v1045um015uq025up015vd018pt"],
	["The Eater", "025630e576035910255p0455r0458t0258q0158v018pm"],
	["The Ethereal", "046200162204625046270861o0863a0261q0161u0461t018pu"],
	["The Fairy Wind", "03502014vv034vf085oc065pu025on015ov045os055p1045of018pj"],
	["The Gale", "045lb045lf015lh065oc0a5pu045oe015ol025or015op018pq"],
	["The Golem", "045930159501598015990958o055aa0159f0259d0158s0458q015fb045fa018po"],
	["The Horde", "095bs085de045cb015ce045c6025c9025ca045cr018pn"],
	["The Mirror", "025020153503599046230f4sa0155v015cc015fc015in025lq015os015rl025vb018pu"],
	["The Peacemaker", "015f0015gi015f6045fb045fm015fe0a5mq035lt045lr015lh018po"],
	["The Pyre", "0a5f0045f1045f3065f9045f4045fa045l9018pm"],
	["The Swarm", "0156004564025660255q0e5t2045rk065rq015rs018pl"],
	["The Uncertainty", "025010h50u044vi044vk014vl044vs014vt018pi"],
	["The Vacuum", "06606065uk015ur045us045v3025uq045ut025up015uo018pt"],
	["The Wall", "0e5de015c5045c2045c8015ci015c3025l8025mq025lo045lm025ln025la015li018pq"],
	["The Waves", "01593035980858o0158s0c5i4045i6015ib015ic045ig018pm"],
	["The Weaponsmith", "044t4024tc044td045c7015c40e5gi045ff045fh025f6015f8018pn"],
	["The Weight", "035610456202565085760855k0255t0155p0455m0155s0255o018pl"]
];
exports.demigod = [
	["Akan", "0c7ac057bu037am027dm027dn027do017n0047n6067n3017nb037n9018pr"],
	["Anubis", "0e71002711037170472i0471l0371b067t7037t9047ti027ta018pt"],
	["Atomsk", "047ne027n90f7t4037t9027tb037ta047td027t5018pr"],
	["Gobannus", "0h7dg067e0067dv047n2037qb047th067tb027ta018pt"],
	["Halwn", "0b71006718047190472i0371a0371n0471j047aj018pn"],
	["Kenosis", "0f744057450674f067k9057jv037k7017k1018pq"],
	["Lycaon", "0a6ts066ve066u2066u1046ud046u7027th037tj027ta018pt"],
	["Neysa", "047gk0b7i6037h6067hb047k6067k5057n2018pq"],
	["Nirrti", "067180571a047n20h7q0037q4037qf067q5047qg018pk"],
	["Nosferatu", "047130c6qq016u1036u30177o0177g027aq027dm017h7017k2057n8017q5017th0380g018pr"],
	["Pele", "0j7780677g0277q0577h0377b037q4057ql027q3018ps"],
	["Sesha", "016uj026ue0271b0374i0678q0677e0577r037b2037dr017gs017h2037kb027nd027nh037te0280b018pi"],
	["Suwako", "0b7ac067bu067ae017al037am047as0480d0380i018pu"],
	["Thetis", "047an047ap027aj0e7gk057h4037gq037h1037gr067gu018pn"],
];
exports.giveRandom = function(type) {
	return exports[type][Math.floor(Math.random() * exports[type].length)];
}