[accessible-pipeline](../README.md) › ["src/core"](_src_core_.md)

# "src/core"

### Interfaces

* [Options](../interfaces/_src_core_.options.md)

### Functions

* [runCore](_src_core_.md#runcore)
* [runCoreStreaming](_src_core_.md#runcorestreaming)

## Functions

###  runCore

▸ **runCore**(`rootURL`: URL, `opts`: [Options](../interfaces/_src_core_.options.md)): *Promise‹object›*

*Defined in [src/core.ts:79](/src/core.ts#L79)*

Runs the assertions at the URL with options, and returns them all at once.

This version is simpler to use (you await it), but it might have memory
pressure issues.

An alternative is runCoreStreaming, which returns results one-at-a-time.

**Parameters:**

Name | Type |
------ | ------ |
`rootURL` | URL |
`opts` | [Options](../interfaces/_src_core_.options.md) |

**Returns:** *Promise‹object›*

___

###  runCoreStreaming

▸ **runCoreStreaming**(`rootURL`: URL, `opts`: [Options](../interfaces/_src_core_.options.md)): *object*

*Defined in [src/core.ts:108](/src/core.ts#L108)*

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
`opts` | [Options](../interfaces/_src_core_.options.md) |

**Returns:** *object*
