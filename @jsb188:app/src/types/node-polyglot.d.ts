declare module 'node-polyglot' {
	class Polyglot {
		constructor(options?: any);

		clear(): void;

		extend(morePhrases: any, prefix?: any): void;

		has(key: any): any;

		locale(newLocale: any): any;

		replace(newPhrases: any): void;

		t(key: any, options?: any): any;

		unset(morePhrases: any, prefix: any): void;

		static transformPhrase(phrase: any, substitutions: any, locale: any): any;
	}

	export default Polyglot;
}
