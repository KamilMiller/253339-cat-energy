/ *! picturefill - v3.0.2 - 2016-02-12
 * https://scottjehl.github.io/picturefill/
 * Авторское право (c) 2016 https://github.com/scottjehl/picturefill/blob/master/Authors.txt; Лицензионный MIT
 * /
/ *! Gecko-Picture - v1.0
 * https://github.com/scottjehl/picturefill/tree/3.0/src/plugins/gecko-picture
 * Ранняя реализация Firefox (до FF41) статична и делает
 * не реагировать на изменения в видовом экране. Этот крошечный модуль исправляет это.
 * /
(функция (окно) {
	/ * jshint eqnull: true * /
	var ua = navigator.userAgent;

	if (window.HTMLPictureElement && ((/ecko/).test(ua) && ua.match (/ rv \: (\ d +) /) && RegExp. $ 1 <45)) {
		addEventListener ("resize", (function () {
			таймер var;

			var dummySrc = document.createElement ("source");

			var fixRespimg = function (img) {
				var source, размеры;
				var picture = img.parentNode;

				if (picture.nodeName.toUpperCase () === "PICTURE") {
					source = dummySrc.cloneNode ();

					picture.insertBefore (source, picture.firstElementChild);
					setTimeout (function () {
						picture.removeChild (источник);
					});
				} else if (! img._pfLastSize || img.offsetWidth> img._pfLastSize) {
					img._pfLastSize = img.offsetWidth;
					размеры = img.sizes;
					img.sizes + = ", 100vw";
					setTimeout (function () {
						img.sizes = размеры;
					});
				}
			};

			var findPictureImgs = function () {
				var i;
				var imgs = document.querySelectorAll ("picture> img, img [srcset] [размеры]");
				для (i = 0; i <imgs.length; i ++) {
					fixRespimg (ГИМ [I]);
				}
			};
			var onResize = function () {
				clearTimeout (таймер);
				timer = setTimeout (findPictureImgs, 99);
			};
			var mq = window.matchMedia && matchMedia ("(ориентация: пейзаж)");
			var init = function () {
				OnResize ();

				if (mq && mq.addListener) {
					mq.addListener (OnResize);
				}
			};

			dummySrc.srcset = "data: image / gif; base64, R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw ==";

			if (/^[c|i]|d$/.test(document.readyState || "")) {
				в этом();
			} else {
				document.addEventListener ("DOMContentLoaded", init);
			}

			return onResize;
		}) ());
	}
})(окно);

/ *! Picturefill - v3.0.2
 * http://scottjehl.github.io/picturefill
 * Авторское право (c) 2015 https://github.com/scottjehl/picturefill/blob/master/Authors.txt;
 * Лицензия: MIT
 * /

(функция (окно, документ, неопределенный) {
	// Включить строгий режим
	«использовать строгую»;

	// HTML shim | v it для старого IE (IE9 все равно будет нуждаться в обходном методе HTML-тега)
	document.createElement ("картинка");

	var warn, eminpx, alwaysCheckWDescriptor, evalId;
	// локальный объект для ссылок на методы и тестирование экспозиции
	var pf = {};
	var isSupportTestReady = false;
	var noop = function () {};
	var image = document.createElement ("img");
	var getImgAttr = image.getAttribute;
	var setImgAttr = image.setAttribute;
	var removeImgAttr = image.removeAttribute;
	var docElem = document.documentElement;
	var types = {};
	var cfg = {
		// выбор ресурсов:
		алгоритм: ""
	};
	var srcAttr = "data-pfsrc";
	var srcsetAttr = srcAttr + "set";
	// ua sniffing выполняется для не обнаруживаемых функций загрузки img,
	// делать некоторые некритические первоочередные оптимизации
	var ua = navigator.userAgent;
	var supportAbort = (/rident/).test(ua) || ((/ecko/).test(ua) && ua.match (/ rv \: (\ d +) /) && RegExp. $ 1> 35);
	var curSrcProp = "currentSrc";
	var regWDesc = / \ s + \ +? \ d + (e \ d +)? w /;
	var regSize = /(\([^)]+\))?\s*(.+)/;
	var setOptions = window.picturefillCFG;
	/ **
	 * Свойство ярлыка для https://w3c.github.io/webappsec/specs/mixedcontent/#restricts-mixed-content (для легкого переопределения в тестах)
	 * /
	// baseStyle также используется getEmValue (то есть: width: 1em является важным)
	var baseStyle = "position: absolute; left: 0; visibility: hidden; display: block; padding: 0; border: none; font-size: 1em; width: 1em; overflow: hidden; clip: rect (0px, 0px, 0px, 0px) ";
	var fsCss = "font-size: 100%! important;";
	var isVwDirty = true;

	var cssCache = {};
	var sizeLengthCache = {};
	var DPR = window.devicePixelRatio;
	var units = {
		px: 1,
		"in": 96
	};
	var anchor = document.createElement ("a");
	/ **
	 * flag уже используется для setOptions. это правда setOptions будет переоценивать
	 * @type {boolean}
	 * /
	var alreadyRun = false;

	// Многоразовые, не-g-regexes

	// (Не используйте \ s, чтобы избежать совпадения неразрывного пространства.)
	var regexLeadingSpaces = / ^ [\ t \ n \ r \ u000c] + /,
	    regexLeadingCommasOrSpaces = / ^ [, \ t \ n \ r \ u000c] + /,
	    regexLeadingNotSpaces = / ^ [^ \ t \ n \ r \ u000c] + /,
	    regexTrailingCommas = / [,] + $ /,
	    regexNonNegativeInteger = / ^ \ d + $ /,

	    // (Положительные или отрицательные или беззнаковые целые числа или десятичные числа, без или без экспонентов.
	    // Должен включать хотя бы одну цифру.
	    // Согласно спецификациям, любая десятичная точка должна сопровождаться цифрой.
	    // Нет знака ведущего плюса.)
	    // https://html.spec.whatwg.org/multipage/infrastructure.html#valid-floating-point-number
	    regexFloatingPoint = /^-?(?:[0-9]+|[0-9]*\ .[0-9]+)(?:[eE][+-]?[0-9]+)? $ /;

	var on = function (obj, evt, fn, capture) {
		if (obj.addEventListener) {
			obj.addEventListener (evt, fn, capture || false);
		} else if (obj.attachEvent) {
			obj.attachEvent ("on" + evt, fn);
		}
	};

	/ **
	 * простая функция memoize:
	 * /

	var memoize = function (fn) {
		var cache = {};
		функция возврата (ввод) {
			if (! (вход в кеш)) {
				cache [input] = fn (вход);
			}
			return cache [input];
		};
	};

	// ФУНКЦИИ УТИЛИТЫ

	// Руководство работает быстрее, чем RegEx
	// http://jsperf.com/whitespace-character/5
	функция isSpace (c) {
		return (c === "\ u0020" || // space
		        c === "\ u0009" || // горизонтальная вкладка
		        c === "\ u000A" || // новая линия
		        c === "\ u000C" || // формируем фид
		        c === "\ u000D"); // возврат каретки
	}

	/ **
	 * получает медиазапись и возвращает логическое значение или получает длину css и возвращает число
	 * @param css mediaqueries или css length
	 * @returns {boolean | number}
	 *
	 * на основе: https://gist.github.com/jonathantneal/db4f77009b155f083738
	 * /
	var evalCSS = (function () {

		var regLength = /^([\d\.]+)(em|vw|px)$/;
		var replace = function () {
			var args = arguments, index = 0, string = args [0];
			while (++ index в args) {
				string = string.replace (args [index], args [++ index]);
			}
			возвращаемая строка;
		};

		var buildStr = memoize (function (css) {

			return "return" + replace ((css || "") .toLowerCase (),
				// интерпретировать `и`
				/ \ band \ b / g, "&&",

				// интерпретировать `,`
				/, / g, "||",

				// интерпретируем `min-` as> =
				/ min - ([az- \ s] +): / g, "e. $ 1> =",

				// интерпретируем `max-` как <=
				/ max - ([az- \ s] +): / g, "e. $ 1 <=",

				// значение вычисления
				/ calc ([^)] +) / g, "($ 1)",

				// интерпретировать значения css
				/(\d+[\.]*[\d]*)([az]+)/g, "($ 1 * e. $ 2)",
				// сделать eval менее злым
				/^(?!(e.[az]|[0-9\.&=|><\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
			) + ";";
		});

		функция возврата (css, length) {
			var parsedLength;
			if (! (css в cssCache)) {
				cssCache [css] = false;
				if (length && (parsedLength = css.match (regLength))) {
					cssCache [css] = parsedLength [1] * units [parsedLength [2]];
				} else {
					/ * jshint evil: true * /
					пытаться{
						cssCache [css] = новая функция («e», buildStr (css)) (единицы);
					} catch (e) {}
					/ * jshint evil: false * /
				}
			}
			return cssCache [css];
		};
	}) ();

	var setResolution = function (кандидат, размерыattr) {
		if (candid.w) {// h = означает height: || descriptor.type === 'h' еще не обрабатывается ...
			кандидат.cWidth = pf.calcListLength (sizesattr || "100vw");
			кандидат.res = кандидат.w / кандидат.cWidth;
		} else {
			кандидат.res = кандидат.
		}
		возвращение кандидата;
	};

	/ **
	 *
	 * @param opt
	 * /
	var picturefill = function (opt) {

		if (! isSupportTestReady) {return;}

		элементы var, i, plen;

		var options = opt || {};

		if (options.elements && options.elements.nodeType === 1) {
			if (options.elements.nodeName.toUpperCase () === "IMG") {
				options.elements = [options.elements];
			} else {
				options.context = options.elements;
				options.elements = null;
			}
		}

		elements = options.elements || pf.qsa ((options.context || document), (options.reevaluate || options.reselect)? pf.sel: pf.selShort);

		if ((plen = elements.length)) {

			pf.setupRun (опции);
			alreadyRun = true;

			// Цикл всех элементов
			для (i = 0; i <plen; i ++) {
				pf.fillImg (элементы [i], опции);
			}

			pf.teardownRun (опции);
		}
	};

	/ **
	 * выводит предупреждение для разработчика
	 * @param {message}
	 * @type {Function}
	 * /
	warn = (window.console && console.warn)?
		функция (сообщение) {
			console.warn (сообщение);
		}:
		Noop
	;

	if (! (curSrcProp на изображении)) {
		curSrcProp = "src";
	}

	// Добавьте поддержку стандартных типов mime.
	types ["image / jpeg"] = true;
	types ["image / gif"] = true;
	types ["image / png"] = true;

	function detectTypeSupport (type, typeUri) {
		// на основе тестера img-webp без потерь
		// примечание: асинхронный
		var image = new window.Image ();
		image.onerror = function () {
			types [type] = false;
			picturefill ();
		};
		image.onload = function () {
			types [type] = image.width === 1;
			picturefill ();
		};
		image.src = typeUri;
		возвращение «ожидает»;
	}

	// проверить поддержку svg
	types ["image / svg + xml"] = document.implementation.hasFeature ("http://www.w3.org/TR/SVG11/feature#Image", "1.1");

	/ **
	 * обновляет внутреннее свойство vW с текущей шириной окна просмотра в px
	 * /
	function updateMetrics () {

		isVwDirty = false;
		DPR = window.devicePixelRatio;
		cssCache = {};
		sizeLengthCache = {};

		pf.DPR = DPR || 1;

		units.width = Math.max (window.innerWidth || 0, docElem.clientWidth);
		units.height = Math.max (window.innerHeight || 0, docElem.clientHeight);

		units.vw = units.width / 100;
		units.vh = units.height / 100;

		evalId = [units.height, units.width, DPR] .join ("-");

		units.em = pf.getEmValue ();
		units.rem = units.em;
	}

	функция selectLowRes (lowerValue, higherValue, dprValue, isCached) {
		var bonusFactor, tooMuch, bonus, meanDensity;

		// экспериментальная
		if (cfg.algorithm === "saveData") {
			if (lowerValue> 2.7) {
				meanDensity = dprValue + 1;
			} else {
				tooMuch = higherValue - dprValue;
				bonusFactor = Math.pow (lowerValue - 0,6, 1,5);

				bonus = tooMuch * bonusFactor;

				if (isCached) {
					bonus + = 0.1 * bonusFactor;
				}

				meanDensity = lowerValue + bonus;
			}
		} else {
			meanDensity = (dprValue> 1)?
				Math.sqrt (lowerValue * higherValue):
				lowerValue;
		}

		return meanDensity> dprValue;
	}

	функция applyBestCandidate (img) {
		var srcSetCandidates;
		var matchingSet = pf.getSet (img);
		var rated = false;
		if (matchingSet! == "pending") {
			оценивается = evalId;
			if (matchingSet) {
				srcSetCandidates = pf.setRes (matchingSet);
				pf.applySetCandidate (srcSetCandidates, img);
			}
		}
		img [pf.ns] .evaled = оценен;
	}

	функция ascendingSort (a, b) {
		return a.res - b.res;
	}

	функция setSrcToCur (img, src, set) {
		var кандидат;
		если (! set && src) {
			set = img [pf.ns] .sets;
			set = set && set [set.length - 1];
		}

		кандидат = getCandidateForSrc (src, set);

		если (кандидат) {
			src = pf.makeUrl (src);
			img [pf.ns] .curSrc = src;
			img [pf.ns] .curCan = кандидат;

			if (! candid.res) {
				setResolution (кандидат, кандидат.set.sizes);
			}
		}
		возвращение кандидата;
	}

	функция getCandidateForSrc (src, set) {
		кандидат, кандидат;
		if (src && set) {
			кандидаты = pf.parseSet (набор);
			src = pf.makeUrl (src);
			для (i = 0; i <candidates.length; i ++) {
				if (src === pf.makeUrl (кандидаты [i] .url)) {
					кандидат = кандидаты [i];
					перерыв;
				}
			}
		}
		возвращение кандидата;
	}

	функция getAllSourceElements (изображение, кандидаты) {
		var i, len, source, srcset;

		// Несоответствие SPEC для размера и перфорации:
		// фактически должны использоваться только исходные элементы, предшествующие img
		// также обратите внимание: не используйте qsa здесь, потому что IE8 иногда не любит источник как ключевую часть в селекторе
		var sources = picture.getElementsByTagName ("source");

		для (i = 0, len = sources.length; i <len; i ++) {
			source = sources [i];
			source [pf.ns] = true;
			srcset = source.getAttribute ("srcset");

			// если источник не имеет атрибута srcset, пропустите
			if (srcset) {
				candidates.push ({
					srcset: srcset,
					media: source.getAttribute ("media"),
					type: source.getAttribute ("type"),
					размеры: source.getAttribute ("размеры")
				});
			}
		}
	}

	/ **
	 * Srcset Parser
	 * Алекс Белл | Лицензия MIT
	 *
	 * @ возвращает Array [{url: _, d: _, w: _, h: _, set: _ (????)}, ...]
	 *
	 * Основанный супер-пупер близко к эталонному алгоритму на:
	 * https://html.spec.whatwg.org/multipage/embedded-content.html#parse-a-srcset-attribute
	 * /

	// 1. Пусть input - это значение, переданное этому алгоритму.
	// (TO-DO: Объясните, какой аргумент «установить» здесь. Возможно, выберите более
	// описательное и более доступное имя. Поскольку передача «набора» в действительности имеет
	// не имеет никакого отношения к разбору, я бы предпочел это назначение в конечном итоге
	// входим во внешний fn.)
	функция parseSrcset (ввод, набор) {

		функция collectCharacters (regEx) {
			var chars,
			    match = regEx.exec (input.substring (pos));
			if (match) {
				chars = match [0];
				pos + = chars.length;
				возвратные символы;
			}
		}

		var inputLength = input.length,
		    URL,
		    дескрипторы,
		    currentDescriptor,
		    государство,
		    с,

		    // 2. Пусть позиция является указателем на ввод, изначально указывающим на начало
		    // строки.
		    pos = 0,

		    // 3. Пусть кандидаты являются изначально пустым набором.
		    кандидатов = [];

		/ **
		* Добавляет свойства дескриптора кандидату, подталкивает к массиву кандидатов
		* @отвершить undefined
		* /
		// (Объявлено вне цикла while так, чтобы оно создавалось только один раз.
		// (Этот fn определен до его использования, чтобы передать JSHINT.
		// К сожалению, это нарушает последовательность комментариев спецификации. : /)
		function parseDescriptors () {

			// 9. Дескриптор-парсер: Пусть ошибка будет.
			var pError = false,

			// 10. Пусть ширина отсутствует.
			// 11. Пусть плотность отсутствует.
			// 12. Пусть future-compat-h отсутствует. (Мы реализуем его сейчас как h)
			    w, d, h, i,
			    кандидат = {},
			    desc, lastChar, value, intVal, floatVal;

			// 13. Для каждого дескриптора в дескрипторах выполните соответствующий набор шагов
			// из следующего списка:
			для (i = 0; i <descriptors.length; i ++) {
				desc = дескрипторы [i];

				lastChar = desc [desc.length - 1];
				value = desc.substring (0, desc.length - 1);
				intVal = parseInt (значение, 10);
				floatVal = parseFloat (значение);

				// Если дескриптор состоит из действительного неотрицательного целого числа, за которым следует
				// символ U + 0077 LATIN SMALL LETTER W
				if (regexNonNegativeInteger.test (значение) && (lastChar === "w")) {

					// Если ширина и плотность не оба отсутствуют, то пусть ошибка будет да.
					if (w || d) {pError = true;}

					// Применяем правила для разбора неотрицательных целых чисел в дескрипторе.
					// Если результат равен нулю, пусть ошибка будет да.
					// В противном случае пусть ширина будет результатом.
					if (intVal === 0) {pError = true;} else {w = intVal;}

				// Если дескриптор состоит из действительного числа с плавающей запятой, за которым следует
				// символ U + 0078 LATIN SMALL LETTER X
				} else if (regexFloatingPoint.test (значение) && (lastChar === "x")) {

					// Если ширина, плотность и future-compat-h не все отсутствуют, то пусть ошибка
					// да.
					если (w || d || h) {pError = true;}

					// Применяем правила для разбора чисел чисел с плавающей запятой в дескрипторе.
					// Если результат меньше нуля, пусть ошибка будет да. В противном случае пусть плотность
					// быть результатом.
					if (floatVal <0) {pError = true;} else {d = floatVal;}

				// Если дескриптор состоит из действительного неотрицательного целого числа, за которым следует
				// символ U + 0068 LATIN SMALL LETTER H
				} else if (regexNonNegativeInteger.test (значение) && (lastChar === "h")) {

					// Если высота и плотность не оба отсутствуют, то пусть ошибка будет да.
					if (h || d) {pError = true;}

					// Применяем правила для разбора неотрицательных целых чисел в дескрипторе.
					// Если результат равен нулю, пусть ошибка будет да. В противном случае пусть future-compat-h
					// быть результатом.
					if (intVal === 0) {pError = true;} else {h = intVal;}

				// Что-нибудь еще, Пусть ошибка будет да.
				} else {pError = true;}
			} // (закройте шаг 13 для цикла)

			// 15. Если ошибка по-прежнему отсутствует, добавьте новый источник изображения к кандидатам, чьи
			// URL-адрес url, связанный с шириной ширины, если не отсутствует, и пиксель
			// плотность плотности, если она отсутствует. В противном случае возникает ошибка синтаксического анализа.
			if (! pError) {
				кандидат. url = url;

				if (w) {candid.w = w;}
				если (d) {кандидат.d = d;}
				если (h) {кандидат.h = h;}
				if (! h &&! d &&! w) {кандидат.d = 1;}
				if (candid.d === 1) {set.has1x = true;}
				candid.set = set;

				candidates.push (кандидат);
			}
		} // (закрыть parseDescriptors fn)

		/ **
		* Токсизирует свойства дескриптора до разбора
		* Возвращает undefined.
		* (Опять же, этот fn определяется до его использования, чтобы передать JSHINT.
		* К сожалению, это нарушает логическую последовательность комментариев спецификации. : /)
		* /
		функция tokenize () {

			// 8.1. Дескриптор tokeniser: Пропустить пробелы
			collectCharacters (regexLeadingSpaces);

			// 8.2. Пусть текущий дескриптор - пустая строка.
			currentDescriptor = "";

			// 8.3. Пусть состояние находится в дескрипторе.
			state = "в дескрипторе";

			while (true) {

				// 8.4. Пусть c - символ в позиции.
				c = input.charAt (pos);

				// Делаем следующее в зависимости от значения состояния.
				// Для целей этого шага «EOF» является специальным символом, представляющим
				// эта позиция прошла через конец ввода.

				// В дескрипторе
				if (состояние === "в дескрипторе") {
					// Делаем следующее, в зависимости от значения c:

				  // Косвенный символ
				  // Если текущий дескриптор не пуст, добавьте текущий дескриптор в
				  // дескрипторы и пусть текущий дескриптор будет пустой строкой.
				  // Установить состояние после дескриптора.
					if (isSpace (c)) {
						if (currentDescriptor) {
							descriptors.push (currentDescriptor);
							currentDescriptor = "";
							state = "после дескриптора";
						}

					// U + 002C COMMA (,)
					// Перемещение позиции к следующему символу на входе. Если текущий дескриптор
					// не пусто, добавьте текущий дескриптор в дескрипторы. Перейти к шагу
					// помечен дескриптор-парсер.
					} else if (c === ",") {
						pos + = 1;
						if (currentDescriptor) {
							descriptors.push (currentDescriptor);
						}
						parseDescriptors ();
						вернуть;

					// U + 0028 LEFT PARENTHESIS (()
					// Добавить c в текущий дескриптор. Установите состояние в parens.
					} else if (c === "\ u0028") {
						currentDescriptor = currentDescriptor + c;
						state = "in parens";

					// EOF
					// Если текущий дескриптор не пуст, добавьте текущий дескриптор в
					// дескрипторы. Перейдите к шагу, помеченному дескриптором парсера.
					} else if (c === "") {
						if (currentDescriptor) {
							descriptors.push (currentDescriptor);
						}
						parseDescriptors ();
						вернуть;

					// Что-нибудь еще
					// Добавить c в текущий дескриптор.
					} else {
						currentDescriptor = currentDescriptor + c;
					}
				// (конец "в дескрипторе"

				// В парнах
				} else if (state === "in parens") {

					// U + 0029 ПРАВИЛЬНЫЙ РОДИТЕЛЬ ())
					// Добавить c в текущий дескриптор. Установите состояние в дескриптор.
					if (c === ")") {
						currentDescriptor = currentDescriptor + c;
						state = "в дескрипторе";

					// EOF
					// Добавить текущий дескриптор в дескрипторы. Перейти к этапу с меткой
					// дескриптор-парсер.
					} else if (c === "") {
						descriptors.push (currentDescriptor);
						parseDescriptors ();
						вернуть;

					// Что-нибудь еще
					// Добавить c в текущий дескриптор.
					} else {
						currentDescriptor = currentDescriptor + c;
					}

				// После дескриптора
				} else if (состояние === "после дескриптора") {

					// Делаем следующее, в зависимости от значения c:
					// Косвенный символ: Оставайтесь в этом состоянии.
					if (isSpace (c)) {

					// EOF: переход к шагу, помеченному парсером дескриптора.
					} else if (c === "") {
						parseDescriptors ();
						вернуть;

					// Что-нибудь еще
					// Установить состояние в дескриптор. Установите позицию на предыдущий символ на входе.
					} else {
						state = "в дескрипторе";
						pos - = 1;

					}
				}

				// Перемещение позиции к следующему символу на входе.
				pos + = 1;

			// Повторите этот шаг.
			} // (закрывается в то время как истинный цикл)
		}

		// 4. Цикл разделения: собрать последовательность символов, которые являются пробелами
		// символы или символы COMMA U + 002C. Если любые символы COMMA U + 002C
		// были собраны, то есть ошибка синтаксического анализа.
		while (true) {
			collectCharacters (regexLeadingCommasOrSpaces);

			// 5. Если позиция прошла через конец ввода, верните кандидаты и прервите эти шаги.
			if (pos> = inputLength) {
				возвращение кандидатов; // (мы закончили, это единственный путь возврата)
			}

			// 6. Соберите последовательность символов, которые не являются символами пробела,
			// и пусть это url.
			url = collectCharacters (regexLeadingNotSpaces);

			// 7. Пусть дескрипторы представляют собой новый пустой список.
			дескрипторы = [];

			// 8. Если url заканчивается символом COM + U + 002C (,), следуйте следующим подшагам:
			// (1). Удалите все конечные символы COMMA U + 002C из URL-адреса. Если это удалено
			// более одного символа, то есть ошибки синтаксического анализа.
			if (url.slice (-1) === ",") {
				url = url.replace (regexTrailingCommas, "");
				// (перейдите к шагу 9, чтобы пропустить токенизацию и просто нажать кандидата).
				parseDescriptors ();

			// В противном случае выполните следующие подшаги:
			} else {
				токенизировать ();
			} // (закройте еще шаг 8)

		// 16. Вернемся к шагу, обозначенному циклом разделения.
		} // (Закрытие большого цикла while).
	}

	/ *
	 * Размеры Parser
	 *
	 * Алекс Белл | Лицензия MIT
	 *
	 * Нестрогий, но точный и легкий JS Parser для строкового значения <img sizes = "here">
	 *
	 * Справочный алгоритм:
	 * https://html.spec.whatwg.org/multipage/embedded-content.html#parse-a-sizes-attribute
	 *
	 * Большинство комментариев копируются непосредственно из спецификации
	 * (за исключением комментариев в parens).
	 *
	 * Грамматика:
	 * <source-size-list> = <source-size> # [, <source-size-value>]? | <Источник-размер-значение>
	 * <источник-размер> = <медиа-условие> <источник-размер-значение>
	 * <источник-размер-значение> = <длина>
	 * http://www.w3.org/html/wg/drafts/html/master/embedded-content.html#attr-img-sizes
	 *
	 * Например: «max-width: 30em) 100vw, (max-width: 50em) 70vw, 100vw"
	 * или "(min-width: 30em), calc (30vw - 15px)" или просто "30vw"
	 *
	 * Возвращает первую допустимую <css-length> с условием носителя, которое оценивается как true,
	 * или «100vw», если все допустимые условия среды оцениваются как ложные.
	 *
	 * /

	функция parseSizes (strValue) {

		// (Процент длины CSS в этом случае недопустим, чтобы избежать путаницы:
		// https://html.spec.whatwg.org/multipage/embedded-content.html#valid-source-size-list
		// CSS допускает один дополнительный знак плюс или минус:
		// http://www.w3.org/TR/CSS2/syndata.html#numbers
		// CSS ASCII нечувствителен к регистру:
		// http://www.w3.org/TR/CSS2/syndata.html#characters)
		// Spec позволяет экспоненциальную нотацию для типа <number>:
		// http://dev.w3.org/csswg/css-values/#numbers
		var regexCssLengthWithUnits = /^(?:[+-]?[0-9]+|[0-9]*\ .[0-9]+)(?:[eE][+-]?[0-9 ] +) (?: ч | см | эм | ех | в | мм | шт | пт | ПВ | бэр | В.Х. | Vmin | Vmax | оч.сл.) $ / я;

		// (Это быстрый и мягкий тест. Из-за дополнительной неограниченной глубины
		// группируя parens и строгие правила интервала, это может стать очень сложным.)
		var regexCssCalc = / ^ calc \ ((:: [0-9a-z \. \ + \ - \ * \ / \ (\)] +) \) $ / i;

		var i;
		var unparsedSizesList;
		var unparsedSizesListLength;
		var unparsedSize;
		var lastComponentValue;
		var size;

		// ФУНКЦИИ УТИЛИТЫ

		// (синтаксический анализатор игрушек. Цели здесь:
		// 1) обширное тестовое покрытие без веса полного анализатора CSS.
		// 2) Избегайте регулярного выражения везде, где это удобно.
		// Быстрые тесты: http://jsfiddle.net/gtntL4gr/3/
		// Возвращает массив массивов.)
		функция parseComponentValues ​​(str) {
			var chrctr;
			var component = "";
			var componentArray = [];
			var listArray = [];
			var parenDepth = 0;
			var pos = 0;
			var inComment = false;

			Функция pushComponent () {
				если (компонент) {
					componentArray.push (компонент);
					component = "";
				}
			}

			функция pushComponentArray () {
				if (componentArray [0]) {
					listArray.push (componentArray);
					componentArray = [];
				}
			}

			// (Петля вперед от начала строки.)
			while (true) {
				chrctr = str.charAt (pos);

				if (chrctr === "") {// (Конечная строка достигнута.)
					pushComponent ();
					pushComponentArray ();
					return listArray;
				} else if (inComment) {
					if ((chrctr === "*") && (str [pos + 1] === "/")) {// (В конце комментария.)
						inComment = false;
						pos + = 2;
						pushComponent ();
						Продолжить;
					} else {
						pos + = 1; // (Пропустить все символы внутри комментариев.)
						Продолжить;
					}
				} else if (isSpace (chrctr)) {
					// (Если предыдущий символ в цикле был также пробелом, или если
					// в начале строки, не добавляйте пробел в
					// составная часть.)
					if ((str.charAt (pos-1) && isSpace (str.charAt (pos-1))) ||! component) {
						pos + = 1;
						Продолжить;
					} else if (parenDepth === 0) {
						pushComponent ();
						pos + = 1;
						Продолжить;
					} else {
						// (Замените любой пробел символом простым пространством для удобочитаемости).
						chrctr = "";
					}
				} else if (chrctr === "(") {
					parenDepth + = 1;
				} else if (chrctr === ")") {
					parenDepth - = 1;
				} else if (chrctr === ",") {
					pushComponent ();
					pushComponentArray ();
					pos + = 1;
					Продолжить;
				} else if ((chrctr === "/") && (str.charAt (pos + 1) === "*")) {
					inComment = true;
					pos + = 2;
					Продолжить;
				}

				компонент = компонент + chrctr;
				pos + = 1;
			}
		}

		функция isValidNonNegativeSourceSizeValue (s) {
			if (regexCssLengthWithUnits.test (s) && (parseFloat (s)> = 0)) {return true;}
			if (regexCssCalc.test (s)) {return true;}
			// (http://www.w3.org/TR/CSS2/syndata.html#numbers говорит:
			// "-0 эквивалентно 0 и не является отрицательным числом". Который означает, что
			// единичный нуль и единичный отрицательный нуль должны приниматься как частные случаи.)
			if ((s === "0") || (s === "-0") || (s === "+0")) {return true;}
			return false;
		}

		// При запросе разбора атрибута size из элемента, выполните синтаксический анализ a
		// список значений компонентов, разделенных запятыми, из значения элемента
		// size (или пустая строка, если атрибут отсутствует), и пусть
		// unparsed size list - результат.
		// http://dev.w3.org/csswg/css-syntax/#parse-comma-separated-list-of-component-values

		unparsedSizesList = parseComponentValues ​​(strValue);
		unparsedSizesListLength = unparsedSizesList.length;

		// Для каждого unparsed размера в списке unparsed sizes:
		для (i = 0; i <unparsedSizesListLength; i ++) {
			unparsedSize = unparsedSizesList [i];

			// 1. Удалите все последовательные <whitespace-token> s с конца нераспакованного размера.
			// (parseComponentValues ​​() уже опускает пробелы за пределами parens.)

			// Если unparsed size теперь пуст, это ошибка синтаксического анализа; перейти к следующему
			// итерация этого алгоритма.
			// (parseComponentValues ​​() не будет толкать пустой массив.)

			// 2. Если последнее значение компонента в unparsed size является допустимым неотрицательным
			// <source-size-value>, пусть размер будет его значением и удалит значение компонента
			// из unparsed size. Любая функция CSS, отличная от функции calc (),
			// недействительным. В противном случае возникает ошибка синтаксического анализа; перейти к следующей итерации
			// этого алгоритма.
			// http://dev.w3.org/csswg/css-syntax/#parse-component-value
			lastComponentValue = unparsedSize [unparsedSize.length - 1];

			if (isValidNonNegativeSourceSizeValue (lastComponentValue)) {
				size = lastComponentValue;
				unparsedSize.pop ();
			} else {
				Продолжить;
			}

			// 3. Удалите все последовательные <whitespace-token> s с конца unparsed
			// размер. Если unparsed size теперь пуст, верните размер и выйдите из этого алгоритма.
			// Если это не последний элемент в списке безпараллельных размеров, это ошибка синтаксического анализа.
			if (unparsedSize.length === 0) {
				размер возврата;
			}

			// 4. Проанализируйте оставшиеся значения компонента в unparsed размере как
			// <media-condition>. Если он не анализируется правильно, или он анализирует
			// правильно, но <media-condition> имеет значение false, перейдите к
			// следующая итерация этого алгоритма.
			// (Разбор всех возможных сложных условий среды в JS является тяжелым, сложным,
			// и выигрыш неясен. Существует ли когда-либо ситуация, когда
			// условие медиа разбора неправильно, но все равно каким-то образом оценивает значение true?
			// Можем ли мы просто полагаться на браузер / полиполк, чтобы сделать это?)
			unparsedSize = unparsedSize.join ("");
			if (! (pf.matchesMedia (unparsedSize))) {
				Продолжить;
			}

			// 5. Вернем размер и выйдите из этого алгоритма.
			размер возврата;
		}

		// Если приведенный выше алгоритм исчерпывает список нерассмотренных размеров без возврата
		// значение размера, возвращаем 100vw.
		return «100vw»;
	}

	// пространство имен
	pf.ns = ("pf" + new Date (). getTime ()). substr (0, 9);

	// srcset support test
	pf.supSrcset = "srcset" в изображении;
	pf.supSizes = "размеры" на изображении;
	pf.supPicture = !! window.HTMLPictureElement;

	// UC браузер утверждает, что поддерживает srcset и изображение, но не размеры,
	// этот расширенный тест показывает, что браузер ничего не поддерживает
	if (pf.supSrcset && pf.supPicture &&! pf.supSizes) {
		(функция (изображение2) {
			image.srcset = "data:, a";
			image2.src = "data:, a";
			pf.supSrcset = image.complete === image2.complete;
			pf.supPicture = pf.supSrcset && pf.supPicture;
		}) (Document.createElement ( "IMG"));
	}

	// Safari9 имеет базовую поддержку размеров, но не раскрывает атрибут idls `size`
	if (pf.supSrcset &&! pf.supSizes) {

		(функция () {
			var width2 = "data: image / gif; base64, R0lGODlhAgABAPAAAP /// wAAACH5BAAAAAAALAAAAAACAAEAAAICBAoAOw ==";
			var width1 = "data: image / gif; base64, R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw ==";
			var img = document.createElement ("img");
			var test = function () {
				var width = img.width;

				if (width === 2) {
					pf.supSizes = true;
				}

				alwaysCheckWDescriptor = pf.supSrcset &&! pf.supSizes;

				isSupportTestReady = true;
				// принудительно асинхронно
				SetTimeout (picturefill);
			};

			img.onload = test;
			img.onerror = test;
			img.setAttribute («размеры», «9px»);

			img.srcset = width1 + "1w," + width2 + "9w";
			img.src = width1;
		}) ();

	} else {
		isSupportTestReady = true;
	}

	// использование pf.qsa вместо dom traversing действительно масштабируется намного лучше,
	// особенно на сайтах, которые смешивают чувствительные и невосприимчивые изображения
	pf.selShort = "picture> img, img [srcset]";
	pf.sel = pf.selShort;
	pf.cfg = cfg;

	/ **
	 * Свойство ярлыка для `devicePixelRatio` (для легкого переопределения в тестах)
	 * /
	pf.DPR = (DPR 1);
	pf.u = единицы;

	// контейнер поддерживаемых типов mime, который может потребоваться для проверки перед использованием
	pf.types = типы;

	pf.setSize = noop;

	/ **
	 * Получает строку и возвращает абсолютный URL-адрес
	 * @param src
	 * @returns {String} абсолютный URL
	 * /

	pf.makeUrl = memoize (function (src) {
		anchor.href = src;
		return anchor.href;
	});

	/ **
	 * Получает элемент DOM или документ и selctor и возвращает найденные совпадения
	 * Может быть расширен с поддержкой jQuery / Sizzle для IE7
	 * @param контекст
	 * @param sel
	 * @returns {NodeList | Array}
	 * /
	pf.qsa = function (context, sel) {
		return ("querySelector" в контексте)? context.querySelectorAll (sel): [];
	};

	/ **
	 * Ярлык для matchMedia (для легкого переопределения в тестах)
	 * wether native или pf.mMQ будет использоваться ленивым при первом вызове
	 * @returns {boolean}
	 * /
	pf.matchesMedia = function () {
		if (window.matchMedia && (matchMedia ("(min-width: 0.1em)") || {}). matches) {
			pf.matchesMedia = function (media) {
				возврат! (matchMedia (media) .matches);
			};
		} else {
			pf.matchesMedia = pf.mMQ;
		}

		return pf.matchesMedia.apply (это, аргументы);
	};

	/ **
	 * Упрощенная реализация matchMedia для IE8 и IE9
	 * обрабатывает только min-width / max-width с значениями px или em
	 * @param media
	 * @returns {boolean}
	 * /
	pf.mMQ = функция (среда) {
		возврат средств массовой информации? evalCSS (media): true;
	};

	/ **
	 * Возвращает расчетную длину в пикселе css из данного источникаSizeValue
	 * http://dev.w3.org/csswg/css-values-3/#length-value
	 * Предполагаемые несоответствия Spec:
	 * * Не проверяет наличие недопустимого использования функций CSS
	 * * Обрабатывает вычисленную длину 0 так же, как отрицательное и, следовательно, недопустимое значение
	 * @param sourceSizeValue
	 * @returns {Number}
	 * /
	pf.calcLength = function (sourceSizeValue) {

		var value = evalCSS (sourceSizeValue, true) || ложный;
		if (значение <0) {
			value = false;
		}

		возвращаемое значение;
	};

	/ **
	 * Принимает строку типа и проверяет, поддерживается ли ее
	 * /

	pf.supportsType = function (type) {
		return (type)? types [type]: true;
	};

	/ **
	 * Парсирует sourceSize в mediaCondition (media) и sourceSizeValue (длина)
	 * @param sourceSizeStr
	 * @returns {*}
	 * /
	pf.parseSize = memoize (function (sourceSizeStr) {
		var match = (sourceSizeStr || "") .match (regSize);
		вернуть {
			media: match && match [1],
			length: match && match [2]
		};
	});

	pf.parseSet = function (set) {
		if (! set.cands) {
			set.cands = parseSrcset (set.srcset, set);
		}
		return set.cands;
	};

	/ **
	 * возвращает 1em в css px для html / body по умолчанию
	 * функция взята из responsejs
	 * @returns {* | number}
	 * /
	pf.getEmValue = function () {
		var body;
		if (! eminpx && (body = document.body)) {
			var div = document.createElement ("div"),
				originalHTMLCSS = docElem.style.cssText,
				originalBodyCSS = body.style.cssText;

			div.style.cssText = baseStyle;

			// 1em в медиа-запросе - значение размера шрифта по умолчанию для браузера
			// сбрасываем docElem и тело, чтобы вернуть правильное значение
			docElem.style.cssText = fsCss;
			body.style.cssText = fsCss;

			body.appendChild (div);
			eminpx = div.offsetWidth;
			body.removeChild (div);

			// также обновлять eminpx перед возвратом
			eminpx = parseFloat (eminpx, 10);

			// восстановить исходные значения
			docElem.style.cssText = originalHTMLCSS;
			body.style.cssText = originalBodyCSS;

		}
		return eminpx || 16;
	};

	/ **
	 * Принимает строку размеров и возвращает ширину в пикселях в виде числа
	 * /
	pf.calcListLength = function (sourceSizeListStr) {
		// Разбить список источников, т. Е. (Max-width: 30em) 100%, (max-width: 50em) 50%, 33%
		//
		// или (min-width: 30em) calc (30% - 15px)
		if (! (sourceSizeListStr в sizeLengthCache) || cfg.uT) {
			var victoryLength = pf.calcLength (parseSizes (sourceSizeListStr));

			sizeLengthCache [sourceSizeListStr] =! victoryLength? units.width: victoryLength;
		}

		return sizeLengthCache [sourceSizeListStr];
	};

	/ **
	 * Принимает объект-кандидат с свойством srcset в виде URL-адреса /
	 * ex. "images / pic-medium.png 1x, images / pic-medium-2x.png 2x" или
	 * "images / pic-medium.png 400w, images / pic-medium-2x.png 800w" или
	 * "images / pic-small.png"
	 * Получите массив кандидатов изображений в форме
	 * {url: "/foo/bar.png", разрешение: 1}
	 * где разрешение: http://dev.w3.org/csswg/css-values-3/#resolution-value
	 * Если указаны размеры, вычисляется res
	 * /
	pf.setRes = function (set) {
		кандидаты;
		if (set) {

			кандидаты = pf.parseSet (набор);

			для (var i = 0, len = candidates.length; i <len; i ++) {
				setResolution (кандидаты [i], set.sizes);
			}
		}
		возвращение кандидатов;
	};

	pf.setRes.res = setResolution;

	pf.applySetCandidate = function( candidates, img ) {
		if ( !candidates.length ) {return;}
		var candidate,
			i,
			j,
			length,
			bestCandidate,
			curSrc,
			curCan,
			candidateSrc,
			abortCurSrc;

		var imageData = img[ pf.ns ];
		var dpr = pf.DPR;

		curSrc = imageData.curSrc || img[curSrcProp];

		curCan = imageData.curCan || setSrcToCur(img, curSrc, candidates[0].set);

		// if we have a current source, we might either become lazy or give this source some advantage
		if ( curCan && curCan.set === candidates[ 0 ].set ) {

			// if browser can abort image request and the image has a higher pixel density than needed
			// and this image isn't downloaded yet, we skip next part and try to save bandwidth
			abortCurSrc = (supportAbort && !img.complete && curCan.res - 0.1 > dpr);

			if ( !abortCurSrc ) {
				curCan.cached = true;

				// if current candidate is "best", "better" or "okay",
				// set it to bestCandidate
				if ( curCan.res >= dpr ) {
					bestCandidate = curCan;
				}
			}
		}

		if ( !bestCandidate ) {

			candidates.sort( ascendingSort );

			length = candidates.length;
			bestCandidate = candidates[ length - 1 ];

			for ( i = 0; i < length; i++ ) {
				candidate = candidates[ i ];
				if ( candidate.res >= dpr ) {
					j = i - 1;

					// we have found the perfect candidate,
					// but let's improve this a little bit with some assumptions ;-)
					if (candidates[ j ] &&
						(abortCurSrc || curSrc !== pf.makeUrl( candidate.url )) &&
						chooseLowRes(candidates[ j ].res, candidate.res, dpr, candidates[ j ].cached)) {

						bestCandidate = candidates[ j ];

					} else {
						bestCandidate = candidate;
					}
					break;
				}
			}
		}

		if ( bestCandidate ) {

			candidateSrc = pf.makeUrl( bestCandidate.url );

			imageData.curSrc = candidateSrc;
			imageData.curCan = bestCandidate;

			if ( candidateSrc !== curSrc ) {
				pf.setSrc( img, bestCandidate );
			}
			pf.setSize( img );
		}
	};

	pf.setSrc = function( img, bestCandidate ) {
		var origWidth;
		img.src = bestCandidate.url;

		// although this is a specific Safari issue, we don't want to take too much different code paths
		if ( bestCandidate.set.type === "image/svg+xml" ) {
			origWidth = img.style.width;
			img.style.width = (img.offsetWidth + 1) + "px";

			// next line only should trigger a repaint
			// if... is only done to trick dead code removal
			if ( img.offsetWidth + 1 ) {
				img.style.width = origWidth;
			}
		}
	};

	pf.getSet = function( img ) {
		var i, set, supportsType;
		var match = false;
		var sets = img [ pf.ns ].sets;

		for ( i = 0; i < sets.length && !match; i++ ) {
			set = sets[i];

			if ( !set.srcset || !pf.matchesMedia( set.media ) || !(supportsType = pf.supportsType( set.type )) ) {
				continue;
			}

			if ( supportsType === "pending" ) {
				set = supportsType;
			}

			match = set;
			break;
		}

		return match;
	};

	pf.parseSets = function( element, parent, options ) {
		var srcsetAttribute, imageSet, isWDescripor, srcsetParsed;

		var hasPicture = parent && parent.nodeName.toUpperCase() === "PICTURE";
		var imageData = element[ pf.ns ];

		if ( imageData.src === undefined || options.src ) {
			imageData.src = getImgAttr.call( element, "src" );
			if ( imageData.src ) {
				setImgAttr.call( element, srcAttr, imageData.src );
			} else {
				removeImgAttr.call( element, srcAttr );
			}
		}

		if ( imageData.srcset === undefined || options.srcset || !pf.supSrcset || element.srcset ) {
			srcsetAttribute = getImgAttr.call( element, "srcset" );
			imageData.srcset = srcsetAttribute;
			srcsetParsed = true;
		}

		imageData.sets = [];

		if ( hasPicture ) {
			imageData.pic = true;
			getAllSourceElements( parent, imageData.sets );
		}

		if ( imageData.srcset ) {
			imageSet = {
				srcset: imageData.srcset,
				sizes: getImgAttr.call( element, "sizes" )
			};

			imageData.sets.push( imageSet );

			isWDescripor = (alwaysCheckWDescriptor || imageData.src) && regWDesc.test(imageData.srcset || "");

			// add normal src as candidate, if source has no w descriptor
			if ( !isWDescripor && imageData.src && !getCandidateForSrc(imageData.src, imageSet) && !imageSet.has1x ) {
				imageSet.srcset += ", " + imageData.src;
				imageSet.cands.push({
					url: imageData.src,
					d: 1,
					set: imageSet
				});
			}

		} else if ( imageData.src ) {
			imageData.sets.push( {
				srcset: imageData.src,
				sizes: null
			} );
		}

		imageData.curCan = null;
		imageData.curSrc = undefined;

		// if img has picture or the srcset was removed or has a srcset and does not support srcset at all
		// or has a w descriptor (and does not support sizes) set support to false to evaluate
		imageData.supported = !( hasPicture || ( imageSet && !pf.supSrcset ) || (isWDescripor && !pf.supSizes) );

		if ( srcsetParsed && pf.supSrcset && !imageData.supported ) {
			if ( srcsetAttribute ) {
				setImgAttr.call( element, srcsetAttr, srcsetAttribute );
				element.srcset = "";
			} else {
				removeImgAttr.call( element, srcsetAttr );
			}
		}

		if (imageData.supported && !imageData.srcset && ((!imageData.src && element.src) ||  element.src !== pf.makeUrl(imageData.src))) {
			if (imageData.src === null) {
				element.removeAttribute("src");
			} else {
				element.src = imageData.src;
			}
		}

		imageData.parsed = true;
	};

	pf.fillImg = function(element, options) {
		var imageData;
		var extreme = options.reselect || options.reevaluate;

		// expando for caching data on the img
		if ( !element[ pf.ns ] ) {
			element[ pf.ns ] = {};
		}

		imageData = element[ pf.ns ];

		// if the element has already been evaluated, skip it
		// unless `options.reevaluate` is set to true ( this, for example,
		// is set to true when running `picturefill` on `resize` ).
		if ( !extreme && imageData.evaled === evalId ) {
			return;
		}

		if ( !imageData.parsed || options.reevaluate ) {
			pf.parseSets( element, element.parentNode, options );
		}

		if ( !imageData.supported ) {
			applyBestCandidate( element );
		} else {
			imageData.evaled = evalId;
		}
	};

	pf.setupRun = function() {
		if ( !alreadyRun || isVwDirty || (DPR !== window.devicePixelRatio) ) {
			updateMetrics();
		}
	};

	// If picture is supported, well, that's awesome.
	if ( pf.supPicture ) {
		picturefill = noop;
		pf.fillImg = noop;
	} else {

		 // Set up picture polyfill by polling the document
		(function() {
			var isDomReady;
			var regReady = window.attachEvent ? /d$|^c/ : /d$|^c|^i/;

			var run = function() {
				var readyState = document.readyState || "";

				timerId = setTimeout(run, readyState === "loading" ? 200 :  999);
				if ( document.body ) {
					pf.fillImgs();
					isDomReady = isDomReady || regReady.test(readyState);
					if ( isDomReady ) {
						clearTimeout( timerId );
					}

				}
			};

			var timerId = setTimeout(run, document.body ? 9 : 99);

			// Also attach picturefill on resize and readystatechange
			// http://modernjavascript.blogspot.com/2013/08/building-better-debounce.html
			var debounce = function(func, wait) {
				var timeout, timestamp;
				var later = function() {
					var last = (new Date()) - timestamp;

					if (last < wait) {
						timeout = setTimeout(later, wait - last);
					} else {
						timeout = null;
						func();
					}
				};

				return function() {
					timestamp = new Date();

					if (!timeout) {
						timeout = setTimeout(later, wait);
					}
				};
			};
			var lastClientWidth = docElem.clientHeight;
			var onResize = function() {
				isVwDirty = Math.max(window.innerWidth || 0, docElem.clientWidth) !== units.width || docElem.clientHeight !== lastClientWidth;
				lastClientWidth = docElem.clientHeight;
				if ( isVwDirty ) {
					pf.fillImgs();
				}
			};

			on( window, "resize", debounce(onResize, 99 ) );
			on( document, "readystatechange", run );
		})();
	}

	pf.picturefill = picturefill;
	//use this internally for easy monkey patching/performance testing
	pf.fillImgs = picturefill;
	pf.teardownRun = noop;

	/* expose methods for testing */
	picturefill._ = pf;

	window.picturefillCFG = {
		pf: pf,
		push: function(args) {
			var name = args.shift();
			if (typeof pf[name] === "function") {
				pf[name].apply(pf, args);
			} else {
				cfg[name] = args[0];
				if (alreadyRun) {
					pf.fillImgs( { reselect: true } );
				}
			}
		}
	};

	while (setOptions && setOptions.length) {
		window.picturefillCFG.push(setOptions.shift());
	}

	/* expose picturefill */
	window.picturefill = picturefill;

	/* expose picturefill */
	if ( typeof module === "object" && typeof module.exports === "object" ) {
		// CommonJS, just export
		module.exports = picturefill;
	} else if ( typeof define === "function" && define.amd ) {
		// AMD support
		define( "picturefill", function() { return picturefill; } );
	}

	// IE8 evals this sync, so it must be the last thing we do
	if ( !pf.supPicture ) {
		types[ "image/webp" ] = detectTypeSupport("image/webp", "data:image/webp;base64,UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAABBxAR/Q9ERP8DAABWUDggGAAAADABAJ0BKgEAAQADADQlpAADcAD++/1QAA==" );
	}

} )( window, document );