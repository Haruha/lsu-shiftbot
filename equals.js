module.exports.equals = function (a, b, enforce_properties_order, cyclic) {
    return a === b // strick equality should be enough unless zero
        &&
        a !== 0 // because 0 === -0, requires test by _equals()
        ||
        _equals(a, b) // handles not strictly equal or zero values
    ;

    function _equals(a, b) {
        // a and b have already failed test for strict equality or are zero

        var s, l, p, x, y;

        // They should have the same toString() signature
        if ((s = toString.call(a)) !== toString.call(b)) return false;

        switch (s) {
            default: // Boolean, Date, String
                return a.valueOf() === b.valueOf();

            case '[object Number]':
                // Converts Number instances into primitive values
                // This is required also for NaN test bellow
                a = +a;
                b = +b;

                return a ? // a is Non-zero and Non-NaN
                    a === b : // a is 0, -0 or NaN
                    a === a ? // a is 0 or -O
                    1 / a === 1 / b // 1/0 !== 1/-0 because Infinity !== -Infinity
                    :
                    b !== b // NaN, the only Number not equal to itself!
                ;
                // [object Number]

            case '[object RegExp]':
                return a.source == b.source &&
                    a.global == b.global &&
                    a.ignoreCase == b.ignoreCase &&
                    a.multiline == b.multiline &&
                    a.lastIndex == b.lastIndex;
                // [object RegExp]

            case '[object Function]':
                return false; // functions should be strictly equal because of closure context
                // [object Function]

            case '[object Array]':
                if (cyclic && (x = reference_equals(a, b)) !== null) return x; // intentionally duplicated bellow for [object Object]

                if ((l = a.length) != b.length) return false;
                // Both have as many elements

                while (l--) {
                    if ((x = a[l]) === (y = b[l]) && x !== 0 || _equals(x, y)) continue;

                    return false;
                }

                return true;
                // [object Array]

            case '[object Object]':
                if (cyclic && (x = reference_equals(a, b)) !== null) return x; // intentionally duplicated from above for [object Array]

                l = 0; // counter of own properties

                if (enforce_properties_order) {
                    var properties = [];

                    for (p in a) {
                        if (a.hasOwnProperty(p)) {
                            properties.push(p);

                            if ((x = a[p]) === (y = b[p]) && x !== 0 || _equals(x, y)) continue;

                            return false;
                        }
                    }

                    // Check if 'b' has as the same properties as 'a' in the same order
                    for (p in b)
                        if (b.hasOwnProperty(p) && properties[l++] != p)
                            return false;
                } else {
                    for (p in a) {
                        if (a.hasOwnProperty(p)) {
                            ++l;

                            if ((x = a[p]) === (y = b[p]) && x !== 0 || _equals(x, y)) continue;

                            return false;
                        }
                    }

                    // Check if 'b' has as not more own properties than 'a'
                    for (p in b)
                        if (b.hasOwnProperty(p) && --l < 0)
                            return false;
                }

                return true;
                // [object Object]
        } // switch toString.call( a )
    } // _equals()

    function reference_equals(a, b) {
        var object_references = [];

        return (reference_equals = _reference_equals)(a, b);

        function _reference_equals(a, b) {
            var l = object_references.length;

            while (l--)
                if (object_references[l--] === b)
                    return object_references[l] === a;

            object_references.push(a, b);

            return null;
        } // _reference_equals()
    } // reference_equals()
} // equals()