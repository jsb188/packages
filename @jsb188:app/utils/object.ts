/**
 * Filter array and return only unique values
 */

export function uniq(arr: Array<any>, fn?: (value: any, index: number, self: Array<any>) => boolean) {
	return arr.filter((value, index, self) => {
		return self.indexOf(value) === index && (!fn || fn(value, index, self));
	});
}

/**
 * Freeze object
 * NOTE: This is useful for preventing Array from turning into Array-like Object
 */

// export function freezeObject(obj: object) {
//   if (Array.isArray(obj)) {
//     Object.freeze(obj);
//   }

//   for (const key in obj) {
//     if (Object.prototype.hasOwnProperty.call(obj, key) && typeof obj[key] === 'object') {
//       freezeObject(obj[key]);
//     }
//   }
// }

/**
 * Remove undefined (and/or null) values from an object
 */

export function removeUndefined<T>(obj: T, removeNull?: boolean) {
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			if (
				obj[key] === undefined ||
				(removeNull && obj[key] === null)
			) {
				delete obj[key];
			} else if (obj[key] && typeof obj[key] === 'object') {
				removeUndefined(obj[key], removeNull);
			}
		}
	}
	return obj;
}

/**
 * Force undefined values to be null instead
 * NOTE: This is useful for database bulkInserts where undefined values in Postgres ORM causes inconsistent queries
 */

export function setUndefinedToNull<T>(obj: T, objMap?: Record<string, any>): T {
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			if (obj[key] === undefined) {
				obj[key] = objMap?.[key] ?? null;
			}
		}
	}
	return obj;
}

/**
 * Try/catch parse JSON object
 */

export function parseJSON(jsonStr?: string) {
	if (jsonStr === undefined || jsonStr === null) {
		return null;
	}

	try {
		return JSON.parse(jsonStr);
	} catch (err) {
		console.warn(err);
	}
	return null;
}

/**
 * Stringify JSON objects with BigInt support
 * NOTE: This will work recursively for nested objects as well.
 */

export function stringifyJSON(obj: any, convertBigIntToNumber: boolean = false): string {
	if (!convertBigIntToNumber) {
		return JSON.stringify(obj, (_key, value) => typeof value === 'bigint' ? Number(value) : value);
	}

	return JSON.stringify(obj, (_key, value) => typeof value === 'bigint' ? value.toString() : value);
}

/**
 * Merge nested objects together
 */

export function mergeNestedObjects(obj1: any, obj2: any) {
	if (!obj1) {
		return { ...obj2 };
	}

	const newObj = { ...obj1 };
	for (const key in obj2) {
		if (Object.prototype.hasOwnProperty.call(obj2, key)) {
			if (typeof obj2[key] === 'object' && obj2[key] !== null) {
				newObj[key] = mergeNestedObjects(obj1[key], obj2[key]);
			} else {
				newObj[key] = obj2[key];
			}
		}
	}

	return newObj;
}

/**
 * Check if objects are equal
 */

export function areObjectsEqual(
	obj1: any,
	obj2: any,
	isNested: boolean = false,
) {
	if (isNested) {
		return JSON.stringify(obj1) === JSON.stringify(obj2);
	} else if (obj1 && obj2) {
		return Object.keys(obj1).every((key: string) => Object.prototype.hasOwnProperty.call(obj2, key) && obj1[key] === obj2[key]);
	}
	return obj1 === obj2;
}

/**
 * Order an array of objects by a key
 */

export function orderBy(
	arr: Array<any>,
	key: ((obj: any) => any) | string,
	order: 'asc' | 'desc' = 'asc',
) {
	const compareFn = (a: any, b: any) => {
		const valueA = typeof key === 'function' ? key(a) : a[key];
		const valueB = typeof key === 'function' ? key(b) : b[key];

		if (valueA < valueB) {
			return order === 'asc' ? -1 : 1;
		}
		if (valueA > valueB) {
			return order === 'asc' ? 1 : -1;
		}
		return 0;
	};

	return arr.sort(compareFn);
}

/**
 * Group array by something
 */

export function groupBy(arr: Array<any>, key: string | ((obj: any) => string)) {
	return arr.reduce((acc, obj) => {
		const group = typeof key === 'function' ? key(obj) : obj[key];
		acc[group] = acc[group] || [];
		acc[group].push(obj);
		return acc;
	}, {});
}

/**
 * Make sure each array item is unique by a key check
 */

export function uniqBy(arr: any[], keys: ((obj: any) => any) | string) {
	let keyGetter;
	if (typeof keys === 'function') {
		keyGetter = keys;
	} else if (Array.isArray(keys)) {
		keyGetter = (o: any) => keys.map((k) => get(o, k)).join('');
	} else {
		keyGetter = (o: any) => get(o, keys);
	}

	return arr.filter((obj, index, self) => {
		const key = keyGetter(obj);
		return self.findIndex((obj2) => {
			const key2 = keyGetter(obj2);
			return key2 === key;
		}) === index;
	});
}

/**
 * Pick a random item from an array
 */

export function randomItem(arr: Array<any>) {
	return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Rearrange an array left or right
 */

export function rearrangeArray(arr: Array<any>, loop: number = 1, shiftRight?: boolean) {
	if (shiftRight) {
		for (let i = 0; i < loop; i++) {
			arr.unshift(arr.pop());
		}
	} else {
		for (let i = 0; i < loop; i++) {
			arr.push(arr.shift());
		}
	}
}

/**
 * Get the value in an object at path separted by dots
 */

export function get(object: any, path: string) {
	return path.split('.').reduce((o, key) => o && o[key], object);
}

/**
 * Zip objects together from a list of alternating keys and values
 * NOTE: Use this after Redis.hgetall()
 */

export function hgetZipObject(arr: Array<string>, mapperFn?: (value: string, index: number) => any) {
	const obj: Record<string, any> = {};
	for (let i = 0; i < arr.length; i += 2) {
		if (mapperFn) {
			obj[arr[i]] = mapperFn(arr[i + 1], i);
		} else {
			obj[arr[i]] = arr[i + 1];
		}
	}
	return obj;
}

/**
 * Zip objects from keys and values
 */

export function zipObject(keys: Array<string>, values: Array<any>) {
	const obj: Record<string, any> = {};
	for (let i = 0; i < keys.length; i++) {
		obj[keys[i]] = values[i];
	}
	return obj;
}

/**
 * Find last index of an item in an array
 * NOTE: Use this for best NodeJS and browser compatibility
 */

export function findLastIndex(arr: Array<any>, fn: (value: any, index: number, array: any[]) => boolean) {
	if (typeof arr.findLastIndex === 'function') {
		return arr.findLastIndex(fn);
	}

	for (let i = arr.length - 1; i >= 0; i--) {
		if (fn(arr[i], i, arr)) {
			return i;
		}
	}
	return -1;
}

/**
 * Array intersection
 */

export function intersection(arr1: Array<any>, arr2: Array<any>) {
	return arr1.filter((value) => arr2.includes(value));
}

/**
 * Group a collection and merge array fields
 * NOTE: Use this after a findAll() query with inner collections
 *
 * @param collections
 * @param innerCollectionNames
 * @param innerCollectionDefaultValues - Use this to define Array or Object
 * @param primaryKeyName
 * @returns
 */

export function groupCollections(
	collections_: Array<any>,
	innerCollectionNames: string[],
	innerCollectionDefaultValues: Record<string, any> = {},
	primaryKey: string | ((o: any) => string) = 'id',
): any[] {
	let hasHash = false;
  let primaryKeyName;
  let collections = collections_;

  if (typeof primaryKey === 'function') {
    primaryKeyName = '__primaryKey';
    collections = collections_.map((obj) => ({
      ...obj,
      __primaryKey: primaryKey(obj),
    }));
  } else {
    primaryKeyName = primaryKey;
  }

	const groupedCollections = collections.reduce((acc, obj) => {
		const primaryKey = obj[primaryKeyName];
		const i = acc.findIndex((o: any) => o[primaryKeyName] === primaryKey);

		if (i === -1) {
			// Map everything without hash first (inner array collections)
			innerCollectionNames.forEach((name: string) => {
				const defaultValue = innerCollectionDefaultValues[name] || [];
				const [, afterHash] = name.split('.#.');

				if (afterHash) {
					// This is a merged array collection
					// This mapping is handled separately after first merge
					// const beforeHashObj = getObject(obj, beforeHash);
					// console.log('beforeHashObj:', beforeHash, beforeHashObj);
					// name = `${beforeHash}.1.${afterHash ? `${afterHash}` : ''}`;
					hasHash = true;
					return;
				}

				const ref = getObject(obj, name);
				if (ref) {
					setObject(obj, name, Array.isArray(defaultValue) ? [ref] : ref);
				} else {
					setObject(obj, name, defaultValue);
				}

				// Old version, but this doesn't support merged array collections
				// if (!obj[name]) {
				// 	obj[name] = [];
				// } else {
				// 	obj[name] = [obj[name]];
				// }
			});

			acc.push(obj);
		} else {
			innerCollectionNames.forEach((name: string) => {
				const defaultValue = innerCollectionDefaultValues[name] || [];
				const [, afterHash] = name.split('.#.');

				if (afterHash) {
					// This is a merged array collection
					// This mapping is handled separately after first merge
					// const beforeHashObj = getObject(obj, beforeHash);
					// console.log('beforeHashObj:', beforeHash, beforeHashObj);
					// name = `${beforeHash}.1.${afterHash ? `${afterHash}` : ''}`;
					hasHash = true;
					return;
				}

				const innerObj = getObject(obj, name);
				const ref = getObject(acc[i], name);

				if (!ref) {
					setObject(acc[i], name, innerObj && Array.isArray(innerObj) ? [innerObj] : (innerObj || defaultValue));
				} else if (innerObj && !ref.find((o: any) => o.id === innerObj.id)) {
					setObject(acc[i], name, Array.isArray(ref) ? ref.concat(innerObj) : innerObj);
				}

				// Old version, but this doesn't support merged array collections
				// const innerObj = obj[name];
				// if (!acc[i][name]) {
				// 	acc[i][name] = innerObj ? [innerObj] : [];
				// } else if (innerObj && !acc[i][name].find((o: any) => o.id === innerObj.id)) {
				// 	acc[i][name].push(obj[name]);
				// }
			});
		}

		return acc;
	}, []);

	if (!hasHash) {
		return groupedCollections;
	}

	innerCollectionNames.forEach((name: string) => {
		const [beforeHash, afterHash] = name.split('.#.');
		if (!afterHash) {
			return;
		}

		const flatName = name.replace('.#.', '.');

		collections.forEach((obj) => {
			const innerObj = getObject(obj, flatName);
			const primaryKey = obj[primaryKeyName];
			const i = groupedCollections.findIndex((o: any) => o[primaryKeyName] === primaryKey);
			const innerParent = getObject(obj, beforeHash);
			const innerParentId = innerParent?.[primaryKeyName];

			if (!innerObj) {
				return;
			}

			if (innerParentId && i >= 0) {
				const innerArr = getObject(groupedCollections[i], beforeHash) || [];
				const j = innerArr.findIndex((o: any) => o[primaryKeyName] === innerParentId);

				if (j >= 0) {
					const currentValue = innerArr[j][afterHash];
					const currentValueIsArray = Array.isArray(currentValue);
					const actualPathName = `${beforeHash}.${j}.${afterHash}`;

					let newValue;
					if (currentValueIsArray) {
						if (!currentValue.find((o) => o.id === innerObj.id)) {
							newValue = currentValue.concat(innerObj);
						}
					} else if (currentValue && currentValue.id !== innerObj.id) {
						newValue = [currentValue].concat(innerObj);
					} else if (!currentValue) {
						newValue = [innerObj];
					} else if (!currentValueIsArray) {
						newValue = [currentValue];
					}

					if (newValue) {
						setObject(groupedCollections[i], actualPathName, newValue);
					}
				}
			}
		});

		collections.forEach((obj) => {
			const innerParent = getObject(obj, beforeHash);

			if (Array.isArray(innerParent)) {
				innerParent.forEach((obj: any) => {
					const innerParentObj = getObject(obj, afterHash);
					if (innerParentObj) {
						if (Array.isArray(innerParentObj)) {
							setObject(obj, afterHash, uniqBy(innerParentObj, primaryKeyName));
						} else {
							setObject(obj, afterHash, [innerParentObj]);
						}
					}
				});
			}
		});
	});

	return groupedCollections;
}

/**
 * Check if Object is array-like, then convert to plain Object.
 * NOTE: This happens a lot when using JS Map()
 * NOTE: This assumes that the keys are ordered numbers
 * NOTE: This function always clones the object.
 */

export function cloneArrayLike(obj: any) {
	if (
		!Array.isArray(obj) &&
		Object.keys(obj).every((key, i) => key === i.toString())
	) {
		return Object.values(obj);
	}
	return { ...obj };
}

/**
 * There's a lot of cases where Array[] are automatically converted to Array-like Objects by Javasript itself.
 * For example, when using JS Map() or Set() with a medium to larget amount of data.
 * This function checks if the object is an array-like Object, and returns a plain Object.
 * @param obj - The object to check
 * @returns - Returns a plain Object if the input is an array-like Object, otherwise returns the original object.
 */

export function mapArrayLikeObjects(obj: any) {
	if (
		!Array.isArray(obj) && obj !== null && typeof obj === 'object' &&
		Object.keys(obj).every((key, i) => key === i.toString())
	) {
		return Object.values(obj);
	}
	return obj;
}

/**
 * Check if Object is iterable
 * @param obj - The object to check
 * @returns - Returns true if the object is iterable, otherwise false
 */

export function isIterable(obj: any) {
	return obj != null && typeof obj[Symbol.iterator] === 'function';
}

/**
 * Get the last key from a JS Map
 * @param map - The Map to get the last key from
 * @returns - Returns the last key from the Map, or undefined if the Map is empty
 */

export function getLastMapKey(map: Map<any, any>) {
	if (!map || map.size === 0) {
		return undefined;
	}
	return Array.from(map.keys()).pop();
}

/**
 * Get the first key from a JS Map
 * @param map - The Map to get the first key from
 * @returns - Returns the first key from the Map, or undefined if the Map is empty
 */

export function getFirstMapKey(map: Map<any, any>) {
	if (!map || map.size === 0) {
		return undefined;
	}
	return Array.from(map.keys()).shift();
}

/**
 * Get value at path in an object
 * @param obj - The object to get the value from
 * @param path - The path to the value, e.g. 'a.b.c'
 * @returns - Returns the value at the path, or undefined if the path does not exist
 */

export function getObject(obj: any, path: string): any {
	if (!obj || !path) {
		return undefined;
	}
	return path.split('.').reduce((o, key) => {
		if (o && typeof o === 'object' && key in o) {
			return o[key];
		}
		return undefined;
	}, obj);
}

/**
 * Set value at path in an object
 * @param obj - The object to set the value in
 * @param path - The path to the value, e.g. 'a.b.c'
 * @param value - The value to set
 * @returns - Returns the modified object
 */

export function setObject(obj: any, path: string, value: any): any {
	if (!obj || !path) {
		return obj;
	}
	const keys = path.split('.');
	const lastKey = keys.pop();
	const nestedObj = keys.reduce((o, key) => {
		if (!o[key]) {
			o[key] = {};
		}
		return o[key];
	}, obj);

	if (lastKey) {
		if (typeof nestedObj === 'object' && nestedObj !== null) {
			nestedObj[lastKey] = value;
		} else {
			console.warn(`(!1) Cannot assign value to ${lastKey} because its reference is not an object.`);
		}
	}

	return obj;
}

/**
 * Check if namespace exists in an object
 * @param obj - The object to check
 * @param namespace - The namespace to check, e.g. 'a.b.c'
 * @returns - Returns true if the namespace exists, otherwise false
 */

export function hasObject(obj: any, namespace: string): boolean {
	if (!obj || !namespace) {
		return false;
	}
	return namespace.split('.').every((key) => {
		if (obj && typeof obj === 'object' && key in obj) {
			obj = obj[key];
			return true;
		}
		return false;
	});
}

/**
 * Sort an Object by keys alphabetically
 * @param obj - The object to sort
 * @returns - Returns a new object with keys sorted alphabetically
 */

export function sortObjectByKeys(obj: Record<string, any>): Record<string, any> {
	if (!obj || typeof obj !== 'object') {
		return obj;
	}

	const sortedKeys = Object.keys(obj).sort();
	const sortedObj: Record<string, any> = {};
	for (const key of sortedKeys) {
		sortedObj[key] = obj[key];
	}
	return sortedObj;
}
