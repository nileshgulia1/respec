
// XXX untested

// Module core/structure

// LIMITATION:
//  At this point we don't support having more than 26 appendices.
// CONFIGURATION:
//  - noTOC: if set to true, no TOC is generated
//  - tocIntroductory: if set to true, the introductory material is listed in the TOC

define(
    [],
    function () {
        return {
            i18n:   {
                en: { toc: "Table of Contents" },
                fr: { toc: "Sommaire" }
            }
        ,   run:    function (conf, doc, cb, msg) {
                msg.pub("start", "core/structure");
                var $secs = $("section:not(.introductory)", doc)
                                .find("h1:first, h2:first, h3:first, h4:first, h5:first, h6:first")
                ,   finish = function () {
                        msg.pub("end", "core/structure");
                        cb();
                    }
                ;
                if (!$secs.length) return finish();
                $secs.each(function () {
                    var depth = $(this).parents("section").length + 1;
                    if (depth > 6) depth = 6;
                    var h = "h" + depth;
                    if (this.localName.toLowerCase() != h) $(this).renameElement(h);
                });

                // makeTOC
                if (!conf.noTOC) {
                    var $ul = this.makeTOCAtLevel($("body", doc), doc, [0], 1, conf);
                    if (!$ul) return;
                    var $sec = $("<section id='toc'/>").append("<h2 class='introductory'>" + this.i18n[conf.lang || "en"].toc + "</h2>")
                                                       .append($ul);
                    var $ref = $("#toc", doc);
                    if (!$ref.length) $ref = $("#sotd", doc);
                    if (!$ref.length) $ref = $("#abstract", doc);
                    $ref.after($sec);
                }

                // Update all anchors with empty content that reference a section ID
                $("a[href^='#']:not(.tocxref)", doc).each(function () {
                    var $a = $(this);
                    if ($a.html() !== "") return;
                    var id = $a.attr("href").slice(1);
                    if (this.secMap[id]) {
                        $a.addClass('sec-ref');
                        $a.html(this.secMap[id]);
                    }
                });

                finish();
            }
        ,   secMap: {}
        ,   appendixMode:   false
        ,   lastNonAppendix:    0
        ,   alphabet:   "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        ,   makeTOCAtLevel:    function ($parent, doc, current, level, conf) {
                var $secs = $parent.children(this.tocIntroductory ? "section" : "section:not(.introductory)");

                if ($secs.length === 0) return null;
                var $ul = $("<ul class='toc'></ul>");
                for (var i = 0; i < $secs.length; i++) {
                    var $sec = $($secs[i], doc)
                    ,   isIntro = $sec.hasClass("introductory")
                    ;
                    if (!$sec.children().length) continue;
                    var h = $sec.children()[0]
                    ,   ln = h.localName.toLowerCase();
                    if (ln !== "h2" && ln !== "h3" && ln !== "h4" && ln !== "h5" && ln !== "h6") continue;
                    var title = h.textContent
                    ,   $hKids = $(h).contents().clone();
                    $hKids.find("a").renameElement("span").attr("class", "formerLink").removeAttr("href");
                    $hKids.find("dfn").renameElement("span").removeAttr("id");
                    var id = $sec.makeID(null, title);
                    
                    if (!isIntro) current[current.length - 1]++;
                    var secnos = current.slice();
                    if ($sec.hasClass("appendix") && current.length === 1 && !this.appendixMode) {
                        this.lastNonAppendix = current[0];
                        this.appendixMode = true;
                    }
                    if (this.appendixMode) secnos[0] = this.alphabet.charAt(current[0] - this.lastNonAppendix);
                    var secno = secnos.join(".")
                    ,   isTopLevel = secnos.length == 1;
                    if (isTopLevel) {
                        secno = secno + ".";
                        // if this is a top level item, insert
                        // an OddPage comment so html2ps will correctly
                        // paginate the output
                        $(h).before(document.createComment('OddPage'));
                    }
                    var $span = $("<span class='secno'></span>").text(secno + " ");
                    if (!isIntro) $(h).prepend($span);
                    this.secMap[id] = "<span class='secno'>" + secno + "</span> " +
                                      "<span class='sec-title'>" + title + "</span>";

                    var $a = $("<a/>").attr({ href: "#" + id, 'class' : 'tocxref' })
                                      .append($span.clone())
                                      .append($hKids);
                    var $item = $("<li class='tocline'/>").append($a);
                    $ul.append($item);
                    if (conf.maxTocLevel && level >= conf.maxTocLevel) continue;
                    current.push(0);
                    var $sub = this.makeTOCAtLevel($sec, doc, current, level + 1, conf);
                    if ($sub) $item.append($sub);
                    current.pop();
                }
                return $ul;
            }
        };
    }
);
