[accessible-pipeline](../README.md) › ["src/core"](_src_core_.md)

# "src/core"

### Type aliases

* [Options](_src_core_.md#options)

### Functions

* [runCore](_src_core_.md#runcore)
* [runCoreStreaming](_src_core_.md#runcorestreaming)

## Type aliases

###  Options

Ƭ **Options**: *object*

*Defined in [src/core.ts:31](https://github.com/ArtemKolichenkov/accessible-pipeline/blob/1a8bed9/src/core.ts#L31)*

#### Type declaration:

## Functions

###  runCore

▸ **runCore**(`rootURL`: URL, `opts`: [Options](_src_core_.md#options)): *Promise‹object›*

*Defined in [src/core.ts:77](https://github.com/ArtemKolichenkov/accessible-pipeline/blob/1a8bed9/src/core.ts#L77)*

Runs the assertions at the URL with options, and returns them all at once.

This version is simpler to use (you await it), but it might have memory
pressure issues.

An alternative is runCoreStreaming, which returns results one-at-a-time.

**Parameters:**

Name | Type |
------ | ------ |
`rootURL` | URL |
`opts` | [Options](_src_core_.md#options) |

**Returns:** *Promise‹object›*

___

###  runCoreStreaming

▸ **runCoreStreaming**(`rootURL`: URL, `opts`: [Options](_src_core_.md#options)): *object*

*Defined in [src/core.ts:106](https://github.com/ArtemKolichenkov/accessible-pipeline/blob/1a8bed9/src/core.ts#L106)*

Runs the assertions at the URL with options, and returns them one-at-a-time,
as an async iterable.

This version allows you to process results at your own pace, which can be
good for memory pressure, as well as implementing other streaming interfaces
on top.

An alternative is runCore, which buffers / collects the results instead.

**`see`** https://2ality.com/2016/10/asynchronous-iteration.html

**`see`** http://javascript.info/async-iterators-generators

**Parameters:**

Name | Type |
------ | ------ |
`rootURL` | URL |
`opts` | [Options](_src_core_.md#options) |

**Returns:** *object*
