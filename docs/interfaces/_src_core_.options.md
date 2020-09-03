[accessible-pipeline](../README.md) › ["src/core"](../modules/_src_core_.md) › [Options](_src_core_.options.md)

# Interface: Options

Common options for excluding links to visit.
For example *.pdf and #heading-link came up often in early iterations

## Hierarchy

* **Options**

### Properties

* [ignoreExtensions](_src_core_.options.md#optional-ignoreextensions)
* [ignoreFragmentLinks](_src_core_.options.md#optional-ignorefragmentlinks)
* [ignoreQueryParams](_src_core_.options.md#optional-ignorequeryparams)
* [maxRetries](_src_core_.options.md#optional-maxretries)
* [pageLimit](_src_core_.options.md#pagelimit)
* [puppeteerChromeLaunchArgs](_src_core_.options.md#optional-puppeteerchromelaunchargs)
* [routeManifestPath](_src_core_.options.md#optional-routemanifestpath)
* [streaming](_src_core_.options.md#optional-streaming)

## Properties

### `Optional` ignoreExtensions

• **ignoreExtensions**? : *Array‹string›*

*Defined in [src/core.ts:41](/src/core.ts#L41)*

A list of extensions to ignore, skipping pages

___

### `Optional` ignoreFragmentLinks

• **ignoreFragmentLinks**? : *undefined | false | true*

*Defined in [src/core.ts:39](/src/core.ts#L39)*

Whether to ignore links of the shape https://example.com#my-id

___

### `Optional` ignoreQueryParams

• **ignoreQueryParams**? : *undefined | false | true*

*Defined in [src/core.ts:43](/src/core.ts#L43)*

Wheter to ignore links of the shape https://example.com/?a=b

___

### `Optional` maxRetries

• **maxRetries**? : *undefined | number*

*Defined in [src/core.ts:37](/src/core.ts#L37)*

The maximum number of retries for a failing page

___

###  pageLimit

• **pageLimit**: *number*

*Defined in [src/core.ts:35](/src/core.ts#L35)*

The maximum number of pages to visit

___

### `Optional` puppeteerChromeLaunchArgs

• **puppeteerChromeLaunchArgs**? : *undefined | string[]*

*Defined in [src/core.ts:49](/src/core.ts#L49)*

List of Chromium flags for Puppeteer launch

___

### `Optional` routeManifestPath

• **routeManifestPath**? : *undefined | string*

*Defined in [src/core.ts:45](/src/core.ts#L45)*

A path to a route manifest file, used to de-duplicate visited pages and routes

___

### `Optional` streaming

• **streaming**? : *undefined | false | true*

*Defined in [src/core.ts:47](/src/core.ts#L47)*

Whether to expose the streaming logging API, used for advanced, "live" reporters
