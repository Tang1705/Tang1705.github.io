(self.webpackChunk = self.webpackChunk || []).push([[97], {
    2122: function () {
        !function () {
            "use strict";
            var t = "undefined" == typeof window, e = !t && "scrollBehavior" in document.documentElement.style,
                o = function () {
                    return (o = Object.assign || function (t) {
                        for (var e, o = 1, l = arguments.length; o < l; o++) for (var n in e = arguments[o]) Object.prototype.hasOwnProperty.call(e, n) && (t[n] = e[n]);
                        return t
                    }).apply(this, arguments)
                };

            function l(t, e) {
                var o = "function" == typeof Symbol && t[Symbol.iterator];
                if (!o) return t;
                var l, n, r = o.call(t), i = [];
                try {
                    for (; (void 0 === e || e-- > 0) && !(l = r.next()).done;) i.push(l.value)
                } catch (s) {
                    n = {error: s}
                } finally {
                    try {
                        l && !l.done && (o = r.return) && o.call(r)
                    } finally {
                        if (n) throw n.error
                    }
                }
                return i
            }

            function n() {
                return null != document.scrollingElement ? document.scrollingElement : document.documentElement
            }

            var r = "scroll-behavior", i = new RegExp("scroll-behavior:\\s*([^;]*)");

            function s(t, e) {
                var o = "scroll-behavior:" + e, l = t.getAttribute("style");
                if (null != l && "" !== l) {
                    var n = c(t);
                    if (null != n) {
                        var r = "scroll-behavior:" + n;
                        l = (l = l.replace(r + ";", "")).replace(r, "")
                    }
                    t.setAttribute("style", l.endsWith(";") ? "" + l + o : ";" + l + o)
                } else t.setAttribute("style", o)
            }

            function c(t) {
                var e = t.getAttribute("style");
                if (null != e && e.includes(r)) {
                    var o = e.match(i);
                    if (null != o) {
                        var n = l(o, 2)[1];
                        if (null != n && "" !== n) return n
                    }
                }
            }

            function a(t, e) {
                if (null != e && "smooth" === e.behavior) return "smooth";
                var o, l = "style" in t ? t : n();
                if ("style" in l) {
                    var r = l.style.scrollBehavior;
                    null != r && "" !== r && (o = r)
                }
                if (null == o) {
                    var i = l.getAttribute("scroll-behavior");
                    null != i && "" !== i && (o = i)
                }
                if (null == o && (o = c(l)), null == o) {
                    var s = getComputedStyle(l).getPropertyValue("scrollBehavior");
                    null != s && "" !== s && (o = s)
                }
                return o
            }

            function u(t) {
                return .5 * (1 - Math.cos(Math.PI * t))
            }

            var d = {
                reset: function () {
                }
            }, p = "undefined" == typeof WeakMap ? void 0 : new WeakMap;

            function f(t) {
                var o = t.startTime, l = t.startX, r = t.startY, i = t.endX, a = t.endY, f = t.method, h = t.scroller,
                    v = 0, y = i - l, w = a - r, m = Math.max(Math.abs(y / 1e3 * 15e3), Math.abs(w / 1e3 * 15e3)),
                    g = function (t) {
                        if (e || null == p) return d;
                        var o, l, r, i, a, u = n(), f = p.get(t);
                        if (null != f) o = f.cachedScrollSnapValue, l = f.cachedScrollBehaviorStyleAttributeValue, r = f.secondaryScroller, i = f.secondaryScrollerCachedScrollSnapValue, a = f.secondaryScrollerCachedScrollBehaviorStyleAttributeValue, f.release(); else {
                            o = "" === t.style.scrollSnapType ? null : t.style.scrollSnapType, l = c(t), r = t === u && u !== document.body ? document.body : void 0, i = null == r ? void 0 : "" === r.style.scrollSnapType ? null : r.style.scrollSnapType, a = null == r ? void 0 : c(r);
                            var h = getComputedStyle(t).getPropertyValue("scroll-snap-type"),
                                v = null == r ? void 0 : getComputedStyle(r).getPropertyValue("scroll-snap-type");
                            if ("none" === h && "none" === v) return d
                        }
                        t.style.scrollSnapType = "none", void 0 !== r && (r.style.scrollSnapType = "none"), void 0 !== l && s(t, l), void 0 !== r && void 0 !== a && s(r, a);
                        var y = !1, w = t === u ? window : t;

                        function m() {
                            w.removeEventListener("scroll", g), null != p && p.delete(t), y = !0
                        }

                        function g() {
                            t.style.scrollSnapType = o, null != r && void 0 !== i && (r.style.scrollSnapType = i), void 0 !== l && s(t, l), void 0 !== r && void 0 !== a && s(r, a), m()
                        }

                        return p.set(t, {
                            release: m,
                            cachedScrollSnapValue: o,
                            cachedScrollBehaviorStyleAttributeValue: l,
                            secondaryScroller: r,
                            secondaryScrollerCachedScrollSnapValue: i,
                            secondaryScrollerCachedScrollBehaviorStyleAttributeValue: a
                        }), {
                            reset: function () {
                                setTimeout((function () {
                                    y || w.addEventListener("scroll", g)
                                }))
                            }
                        }
                    }(h);
                requestAnimationFrame((function t(e) {
                    v += e - o;
                    var n = Math.max(0, Math.min(1, 0 === m ? 0 : v / m)), s = Math.floor(l + y * u(n)),
                        c = Math.floor(r + w * u(n));
                    f(s, c), s !== i || c !== a ? requestAnimationFrame(t) : null != g && (g.reset(), g = void 0)
                }))
            }

            var h = t ? void 0 : Element.prototype.scroll, v = t ? void 0 : window.scroll,
                y = t ? void 0 : Element.prototype.scrollBy, w = t ? void 0 : window.scrollBy,
                m = t ? void 0 : Element.prototype.scrollTo, g = t ? void 0 : window.scrollTo;

            function b(t, e) {
                this.__adjustingScrollPosition = !0, this.scrollLeft = t, this.scrollTop = e, delete this.__adjustingScrollPosition
            }

            function S(t, e) {
                return b.call(this, t, e)
            }

            function T(t, e) {
                this.__adjustingScrollPosition = !0, this.scrollLeft += t, this.scrollTop += e, delete this.__adjustingScrollPosition
            }

            function E(t, e) {
                switch (t) {
                    case"scroll":
                        return e instanceof Element ? null != h ? h : b : v;
                    case"scrollBy":
                        return e instanceof Element ? null != y ? y : T : w;
                    case"scrollTo":
                        return e instanceof Element ? null != m ? m : S : g
                }
            }

            function M(t, e, o, l) {
                var r = "performance" in window ? performance.now() : Date.now();
                if (t instanceof Element) return {
                    startTime: r,
                    startX: i = t.scrollLeft,
                    startY: s = t.scrollTop,
                    endX: Math.floor("scrollBy" === l ? i + e : e),
                    endY: Math.floor("scrollBy" === l ? s + o : o),
                    method: E("scrollTo", t).bind(t),
                    scroller: t
                };
                var i, s, c = window.scrollX, a = window.pageXOffset, u = window.scrollY, d = window.pageYOffset;
                return {
                    startTime: r,
                    startX: i = null == c || 0 === c ? a : c,
                    startY: s = null == u || 0 === u ? d : u,
                    endX: Math.floor("scrollBy" === l ? i + e : e),
                    endY: Math.floor("scrollBy" === l ? s + o : o),
                    method: E("scrollTo", window).bind(window),
                    scroller: n()
                }
            }

            function V(t) {
                return null == t ? 0 : "number" == typeof t ? t : "string" == typeof t ? parseFloat(t) : 0
            }

            function B(t) {
                return null != t && "object" == typeof t
            }

            function I(t, e, l, n) {
                !function (t, e, o) {
                    var l = a(e, t);
                    null == l || "auto" === l ? E(o, e).call(e, t.left, t.top) : f(M(e, t.left, t.top, o))
                }(function (t, e) {
                    if (void 0 === e && !B(t)) throw new TypeError("Failed to execute 'scroll' on 'Element': parameter 1 ('options') is not an object.");
                    return B(t) ? o(o({}, L(t.left, t.top)), {behavior: null == t.behavior ? "auto" : t.behavior}) : o(o({}, L(t, e)), {behavior: "auto"})
                }(l, n), t, e)
            }

            function L(t, e) {
                return {left: V(t), top: V(e)}
            }

            function P(t) {
                return "nodeType" in t && 1 === t.nodeType ? t.parentNode : "ShadowRoot" in window && t instanceof window.ShadowRoot ? t.host : t === document ? window : t instanceof Node ? t.parentNode : null
            }

            function j(t) {
                return "visible" !== t && "clip" !== t
            }

            function W(t) {
                if (t.clientHeight < t.scrollHeight || t.clientWidth < t.scrollWidth) {
                    var e = getComputedStyle(t, null);
                    return j(e.overflowY) || j(e.overflowX)
                }
                return !1
            }

            function C(t) {
                for (var e = t, o = n(); null != e;) {
                    var l = a(e);
                    if (null != l && (e === o || W(e))) return [e, l];
                    e = P(e)
                }
                for (e = t; null != e;) {
                    if (e === o || W(e)) return [e, "auto"];
                    e = P(e)
                }
                return [o, "auto"]
            }

            function O(t) {
                if (void 0 === t && (t = location), "origin" in t && null != t.origin) return t.origin;
                var e = null != t.port && t.port.length > 0 ? ":" + t.port : "";
                return ("http:" === t.protocol && ":80" === e || "https:" === t.protocol && ":443" === e) && (e = ""), t.protocol + "//" + t.hostname + e
            }

            var A = /^#\d/;

            function X() {
                window.addEventListener("click", (function (t) {
                    if (t.isTrusted && t.target instanceof HTMLAnchorElement) {
                        var e = t.target, o = e.pathname, n = e.search, r = e.hash;
                        if (O(t.target) === O(location) && o === location.pathname && n === location.search && null != r && !(r.length < 1)) {
                            var i = function (t) {
                                for (var e = t; null != e;) {
                                    if ("ShadowRoot" in window && e instanceof window.ShadowRoot) return e;
                                    var o = P(e);
                                    if (o === e) return document;
                                    e = o
                                }
                                return document
                            }(t.target), s = null != r.match(A) ? i.getElementById(r.slice(1)) : i.querySelector(r);
                            if (null != s) {
                                var c = l(C(s), 2)[1];
                                "smooth" === c && (t.preventDefault(), s.scrollIntoView({behavior: c}))
                            }
                        }
                    }
                }))
            }

            var Y = t ? void 0 : Element.prototype.scrollIntoView;

            function _(t, e, o, l, n, r, i, s) {
                return r < t && i > e || r > t && i < e ? 0 : r <= t && s <= o || i >= e && s >= o ? r - t - l : i > e && s < o || r < t && s > o ? i - e + n : 0
            }

            function H(t, e, o) {
                var l = o.block, r = o.inline, i = n(),
                    s = null != window.visualViewport ? visualViewport.width : innerWidth,
                    c = null != window.visualViewport ? visualViewport.height : innerHeight,
                    a = null != window.scrollX ? window.scrollX : window.pageXOffset,
                    u = null != window.scrollY ? window.scrollY : window.pageYOffset, d = t.getBoundingClientRect(),
                    p = d.height, f = d.width, h = d.top, v = d.right, y = d.bottom, w = d.left,
                    m = "start" === l || "nearest" === l ? h : "end" === l ? y : h + p / 2,
                    g = "center" === r ? w + f / 2 : "end" === r ? v : w, b = e.getBoundingClientRect(), S = b.height,
                    T = b.width, E = b.top, M = b.right, V = b.bottom, B = b.left, I = getComputedStyle(e),
                    L = parseInt(I.borderLeftWidth, 10), P = parseInt(I.borderTopWidth, 10),
                    j = parseInt(I.borderRightWidth, 10), W = parseInt(I.borderBottomWidth, 10), C = 0, O = 0,
                    A = "offsetWidth" in e ? e.offsetWidth - e.clientWidth - L - j : 0,
                    X = "offsetHeight" in e ? e.offsetHeight - e.clientHeight - P - W : 0;
                if (i === e) C = "start" === l ? m : "end" === l ? m - c : "nearest" === l ? _(u, u + c, c, P, W, u + m, u + m + p, p) : m - c / 2, O = "start" === r ? g : "center" === r ? g - s / 2 : "end" === r ? g - s : _(a, a + s, s, L, j, a + g, a + g + f, f), C = Math.max(0, C + u), O = Math.max(0, O + a); else {
                    C = "start" === l ? m - E - P : "end" === l ? m - V + W + X : "nearest" === l ? _(E, V, S, P, W + X, m, m + p, p) : m - (E + S / 2) + X / 2, O = "start" === r ? g - B - L : "center" === r ? g - (B + T / 2) + A / 2 : "end" === r ? g - M + j + A : _(B, M, T, L, j + A, g, g + f, f);
                    var Y = e.scrollLeft, H = e.scrollTop;
                    C = Math.max(0, Math.min(H + C, e.scrollHeight - S + X)), O = Math.max(0, Math.min(Y + O, e.scrollWidth - T + A))
                }
                return {top: C, left: O}
            }

            var k = t ? void 0 : Object.getOwnPropertyDescriptor(Element.prototype, "scrollTop").set;
            var x = t ? void 0 : Object.getOwnPropertyDescriptor(Element.prototype, "scrollLeft").set;
            var R = !t && ("scroll" in Element.prototype && "scrollTo" in Element.prototype && "scrollBy" in Element.prototype && "scrollIntoView" in Element.prototype);
            t || e && R || (Element.prototype.scroll = function (t, e) {
                I(this, "scroll", t, e)
            }, Element.prototype.scrollBy = function (t, e) {
                I(this, "scrollBy", t, e)
            }, Element.prototype.scrollTo = function (t, e) {
                I(this, "scrollTo", t, e)
            }, Element.prototype.scrollIntoView = function (t) {
                var e = null == t || !0 === t ? {block: "start", inline: "nearest"} : !1 === t ? {
                    block: "end",
                    inline: "nearest"
                } : t, n = l(C(this), 2), r = n[0], i = n[1], s = null != e.behavior ? e.behavior : i;
                if ("smooth" === s) r.scrollTo(o({behavior: s}, H(this, r, e))); else if (null != Y) Y.call(this, e); else {
                    var c = H(this, r, e), a = c.top, u = c.left;
                    E("scrollTo", this).call(this, u, a)
                }
            }, null != HTMLElement.prototype.scrollIntoView && HTMLElement.prototype.scrollIntoView !== Element.prototype.scrollIntoView && (HTMLElement.prototype.scrollIntoView = Element.prototype.scrollIntoView), Object.defineProperty(Element.prototype, "scrollLeft", {
                set: function (t) {
                    return this.__adjustingScrollPosition ? x.call(this, t) : (I(this, "scrollTo", t, this.scrollTop), t)
                }
            }), Object.defineProperty(Element.prototype, "scrollTop", {
                set: function (t) {
                    return this.__adjustingScrollPosition ? k.call(this, t) : (I(this, "scrollTo", this.scrollLeft, t), t)
                }
            }), window.scroll = function (t, e) {
                I(this, "scroll", t, e)
            }, window.scrollBy = function (t, e) {
                I(this, "scrollBy", t, e)
            }, window.scrollTo = function (t, e) {
                I(this, "scrollTo", t, e)
            }, X())
        }()
    }
}]);