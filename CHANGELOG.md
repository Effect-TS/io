# @effect/io

## 0.1.0

### Minor Changes

- [#211](https://github.com/Effect-TS/io/pull/211) [`668ee25`](https://github.com/Effect-TS/io/commit/668ee254e65353de63e32b0fb51e7aa5625be6a5) Thanks [@IMax153](https://github.com/IMax153)! - add Effect.setConfigProvider

- [#211](https://github.com/Effect-TS/io/pull/211) [`53c3b0c`](https://github.com/Effect-TS/io/commit/53c3b0cb0611e59aed34798b1a10dc234cccfd37) Thanks [@IMax153](https://github.com/IMax153)! - simplify Effect.race

- [#211](https://github.com/Effect-TS/io/pull/211) [`9c9b95d`](https://github.com/Effect-TS/io/commit/9c9b95d31f051cc83a56a73bdd49c7079447c36f) Thanks [@IMax153](https://github.com/IMax153)! - implement ConfigProvider.contramapPath

- [#211](https://github.com/Effect-TS/io/pull/211) [`cb7a2d4`](https://github.com/Effect-TS/io/commit/cb7a2d483ac7d752cb3468f40517d03aeaa24819) Thanks [@IMax153](https://github.com/IMax153)! - avoid splitting values in Config except for sequences

- [#211](https://github.com/Effect-TS/io/pull/211) [`cd51837`](https://github.com/Effect-TS/io/commit/cd51837ef3ab8cdfba258b4b97cd80d58e8d7e8f) Thanks [@IMax153](https://github.com/IMax153)! - add Metric.timerWithBoundaries

- [#211](https://github.com/Effect-TS/io/pull/211) [`21f99a5`](https://github.com/Effect-TS/io/commit/21f99a51bc89fcfe473aec6932d93a2658258bb2) Thanks [@IMax153](https://github.com/IMax153)! - uppercase key paths in ConfigProvider.fromEnv

- [#208](https://github.com/Effect-TS/io/pull/208) [`ad12eb4`](https://github.com/Effect-TS/io/commit/ad12eb44eb8d57d4a16be8f1d858eb319b568243) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update dependencies

### Patch Changes

- [#212](https://github.com/Effect-TS/io/pull/212) [`090b8f5`](https://github.com/Effect-TS/io/commit/090b8f5d150b0ab060cce487959c18d59b9926c9) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Unbundle runtime

- [#214](https://github.com/Effect-TS/io/pull/214) [`ff5f9f9`](https://github.com/Effect-TS/io/commit/ff5f9f9f15370724c2808e652327880689987633) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Expose getCurrentFiber

- [#203](https://github.com/Effect-TS/io/pull/203) [`3ecf681`](https://github.com/Effect-TS/io/commit/3ecf6810b7c07e34eb58bc7a7eff0fe87e873f03) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Introduce Error based tracing and dual methods

- [#210](https://github.com/Effect-TS/io/pull/210) [`98c04aa`](https://github.com/Effect-TS/io/commit/98c04aa8eeaa7b16ff22a2d944b5f3461cceaddc) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix mistaken type

## 0.0.66

### Patch Changes

- [`a4a2c9a`](https://github.com/Effect-TS/io/commit/a4a2c9a077bca8c2ad99601b274e1526c6d2a6f4) Thanks [@patroza](https://github.com/patroza)! - Add toString to Exceptions

- [#198](https://github.com/Effect-TS/io/pull/198) [`59747ea`](https://github.com/Effect-TS/io/commit/59747ea66236e77d589020d17e3d26d575622734) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve RuntimeFlags API

- [#198](https://github.com/Effect-TS/io/pull/198) [`4448e99`](https://github.com/Effect-TS/io/commit/4448e99fa63d1c835359615e994e6dc1e113224e) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Expose Schedule step and initial needed for custom schedules

- [#198](https://github.com/Effect-TS/io/pull/198) [`b41507a`](https://github.com/Effect-TS/io/commit/b41507a76c833fdc01ca8c1c89dc1d17b04bc649) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve Layer API

- [#199](https://github.com/Effect-TS/io/pull/199) [`7d0a9dc`](https://github.com/Effect-TS/io/commit/7d0a9dcf20feb02028f7847bdf2f4d9210539a0d) Thanks [@patroza](https://github.com/patroza)! - Fix missing \_tag in built-in Exceptions

- [#196](https://github.com/Effect-TS/io/pull/196) [`f1b8d74`](https://github.com/Effect-TS/io/commit/f1b8d74cfd31b0bfa9622b28f61ff2db46303a7f) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve Deferred API

- [#198](https://github.com/Effect-TS/io/pull/198) [`a941859`](https://github.com/Effect-TS/io/commit/a9418593727ff417b09906c699659216b4190100) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Defer standardization of OTEL Tracer

- [#198](https://github.com/Effect-TS/io/pull/198) [`e20b27b`](https://github.com/Effect-TS/io/commit/e20b27b1c1fbe5ae7cc2fc9abafc3e9e08054f75) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve Reloadable API

- [#198](https://github.com/Effect-TS/io/pull/198) [`411248e`](https://github.com/Effect-TS/io/commit/411248e9125e7d6c565a112f67391b99ab6e3de2) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Type Queue functions as Effect constructors

- [#201](https://github.com/Effect-TS/io/pull/201) [`02f1e57`](https://github.com/Effect-TS/io/commit/02f1e575f3c37377b03890b4e28f499e042dac05) Thanks [@IMax153](https://github.com/IMax153)! - enhancements to Config and ConfigProvider

- [#194](https://github.com/Effect-TS/io/pull/194) [`d4fdba5`](https://github.com/Effect-TS/io/commit/d4fdba556273d7a947528aefadd2579d22b3e8e2) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve Ref, Ref.Syncronized and ScopedRef API

- [#198](https://github.com/Effect-TS/io/pull/198) [`ed6ff39`](https://github.com/Effect-TS/io/commit/ed6ff395b84fe1a4b64f274b2a88d09cedc032b7) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Type Ref functions as Effect constructors

- [#198](https://github.com/Effect-TS/io/pull/198) [`87d2ac0`](https://github.com/Effect-TS/io/commit/87d2ac0ca78b61f32cfdbe5ba6903de5d6e27b2a) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Type Scope functions as Effect constructors

- [#198](https://github.com/Effect-TS/io/pull/198) [`8f1c465`](https://github.com/Effect-TS/io/commit/8f1c46559366536f866b76999b8c8fafff187e5e) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve FiberRefs API

- [#198](https://github.com/Effect-TS/io/pull/198) [`44f1f6e`](https://github.com/Effect-TS/io/commit/44f1f6e0c86be42f2c5134bb9d0dae9219fbadc7) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Type Deferred functions as Effect constructors

- [#198](https://github.com/Effect-TS/io/pull/198) [`fa08f70`](https://github.com/Effect-TS/io/commit/fa08f70a68a72608c15ecc1e0d6d26a7c6d276bc) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve Hub API

- [#198](https://github.com/Effect-TS/io/pull/198) [`b3b862f`](https://github.com/Effect-TS/io/commit/b3b862f9c9068ac1a2d3ebe258f257aaa72d07a5) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Type FiberRef functions as Effect constructors

- [#198](https://github.com/Effect-TS/io/pull/198) [`61cf166`](https://github.com/Effect-TS/io/commit/61cf166da47700951fba5008eb20937f648c56be) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add Layer.mergeAll

- [#198](https://github.com/Effect-TS/io/pull/198) [`46171ba`](https://github.com/Effect-TS/io/commit/46171ba581aeebc50f7c4d68070130b1b0f34100) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve Fiber unsafe api

- [#197](https://github.com/Effect-TS/io/pull/197) [`3af5aa3`](https://github.com/Effect-TS/io/commit/3af5aa35f34c12f877a982bb36bea82973260120) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Prevent tacit usage of constructors with no arguments

## 0.0.65

### Patch Changes

- [#192](https://github.com/Effect-TS/io/pull/192) [`911994d`](https://github.com/Effect-TS/io/commit/911994d11122cca68d7f1c7647b8803b68d87f55) Thanks [@patroza](https://github.com/patroza)! - Use LazyArg where appropriate. Thanks @tim-smart

## 0.0.64

### Patch Changes

- [#190](https://github.com/Effect-TS/io/pull/190) [`c45ac05`](https://github.com/Effect-TS/io/commit/c45ac05d34a15b69a3e05361769d93af818f6772) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Expose preferred execution via Scheduler

- [#188](https://github.com/Effect-TS/io/pull/188) [`b8f7154`](https://github.com/Effect-TS/io/commit/b8f7154567ecd71940b27788b5bd1303141562f2) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Align Fiber Methods

- [#183](https://github.com/Effect-TS/io/pull/183) [`d12fea7`](https://github.com/Effect-TS/io/commit/d12fea7616565cde7c5f230f2ec1179668dd347c) Thanks [@patroza](https://github.com/patroza)! - fix sequence configs

## 0.0.63

### Patch Changes

- [#186](https://github.com/Effect-TS/io/pull/186) [`91115f2`](https://github.com/Effect-TS/io/commit/91115f26704799807c47ce3e35316024d0d4f2fb) Thanks [@patroza](https://github.com/patroza)! - Fix FiberRefs.currentLogAnnotations leak

- [#185](https://github.com/Effect-TS/io/pull/185) [`f8b3ff5`](https://github.com/Effect-TS/io/commit/f8b3ff556320e6ac8be98f1760e97d9a5fa8ee68) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Remove dependency on MutableHashSet

## 0.0.62

### Patch Changes

- [#181](https://github.com/Effect-TS/io/pull/181) [`2911cd8`](https://github.com/Effect-TS/io/commit/2911cd817afcf5fcc1aa2a49f488cdc5f0b51a8b) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update build scripts

## 0.0.61

### Patch Changes

- [#177](https://github.com/Effect-TS/io/pull/177) [`d5ea3ec`](https://github.com/Effect-TS/io/commit/d5ea3ecfa6e11ec0492033fd5a59bbadaf541467) Thanks [@patroza](https://github.com/patroza)! - Extracted logfmtLogger from stringLogger and restored linebreaks in stringLogger.

- [#180](https://github.com/Effect-TS/io/pull/180) [`2adf0bb`](https://github.com/Effect-TS/io/commit/2adf0bb4b7f768534c88f46b742aeefd66d7b843) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - improve layer api

- [#175](https://github.com/Effect-TS/io/pull/175) [`56d775b`](https://github.com/Effect-TS/io/commit/56d775bcf85de67b1867818c4da5eaeb511fd082) Thanks [@IMax153](https://github.com/IMax153)! - add several Layer combinators

- [#178](https://github.com/Effect-TS/io/pull/178) [`ee0a5f2`](https://github.com/Effect-TS/io/commit/ee0a5f22455985fe5b9002a1aabd36de4b5bdb29) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Make Tracer compatible with OTEL-like systems

## 0.0.60

### Patch Changes

- [#173](https://github.com/Effect-TS/io/pull/173) [`088f803`](https://github.com/Effect-TS/io/commit/088f80360ea0c5f96dcfc59f51ac7bf23fa8ca61) Thanks [@IMax153](https://github.com/IMax153)! - use "," as seqDelim in ConfigProvider.fromEnv

## 0.0.59

### Patch Changes

- [#171](https://github.com/Effect-TS/io/pull/171) [`857941c`](https://github.com/Effect-TS/io/commit/857941cfa3a00489e7dfcbda9395a4c7667a8609) Thanks [@IMax153](https://github.com/IMax153)! - fix Random.nextIntBetween

## 0.0.58

### Patch Changes

- [#169](https://github.com/Effect-TS/io/pull/169) [`d7dc29a`](https://github.com/Effect-TS/io/commit/d7dc29a3f266e44616d5952fdec0703dadf2fd9d) Thanks [@IMax153](https://github.com/IMax153)! - fix TestAnnotationMap.empty

- [#169](https://github.com/Effect-TS/io/pull/169) [`1c52e5c`](https://github.com/Effect-TS/io/commit/1c52e5c948c8186ac58118d75e03af296f3086c2) Thanks [@IMax153](https://github.com/IMax153)! - improve performance of TestAnnotationMap.combine

## 0.0.57

### Patch Changes

- [#167](https://github.com/Effect-TS/io/pull/167) [`4594c6f`](https://github.com/Effect-TS/io/commit/4594c6f1084781cf9c04423cbd7679cc08986deb) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve semahore again

## 0.0.56

### Patch Changes

- [#165](https://github.com/Effect-TS/io/pull/165) [`762bf09`](https://github.com/Effect-TS/io/commit/762bf09a9e63ae9cfa06a7afa88aea4b1ff7b4f3) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve liteweight semaphore

- [#164](https://github.com/Effect-TS/io/pull/164) [`f26abe6`](https://github.com/Effect-TS/io/commit/f26abe6d82be738e1bba4734c1d1537dd475333e) Thanks [@IMax153](https://github.com/IMax153)! - use FiberRefs for TestServices

- [#162](https://github.com/Effect-TS/io/pull/162) [`88fc794`](https://github.com/Effect-TS/io/commit/88fc7948a223798c74f3f535da27c834169e8157) Thanks [@IMax153](https://github.com/IMax153)! - make tags a regional setting

## 0.0.55

### Patch Changes

- [#160](https://github.com/Effect-TS/io/pull/160) [`0b9a92d`](https://github.com/Effect-TS/io/commit/0b9a92d96d75e425371661f2217efae75a9d704b) Thanks [@patroza](https://github.com/patroza)! - Improve stringlogger logfmt compatibility

## 0.0.54

### Patch Changes

- [#158](https://github.com/Effect-TS/io/pull/158) [`2f86303`](https://github.com/Effect-TS/io/commit/2f86303080ac25bc78c2d11bee1444e6d2e2144c) Thanks [@IMax153](https://github.com/IMax153)! - make all testing utils internal

## 0.0.53

### Patch Changes

- [#156](https://github.com/Effect-TS/io/pull/156) [`4aa0fb1`](https://github.com/Effect-TS/io/commit/4aa0fb1a47489cd792eb4920440a430ecf92a675) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve squash priority

## 0.0.52

### Patch Changes

- [#154](https://github.com/Effect-TS/io/pull/154) [`99c12bd`](https://github.com/Effect-TS/io/commit/99c12bdaa68d5c8051b90890c6269ebf5b5019e4) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update fp-ts/data

## 0.0.51

### Patch Changes

- [#153](https://github.com/Effect-TS/io/pull/153) [`4bbd707`](https://github.com/Effect-TS/io/commit/4bbd707b0a3c8aeee63cf274dfb22c31b02a3c23) Thanks [@IMax153](https://github.com/IMax153)! - upgrade dependencies

- [#153](https://github.com/Effect-TS/io/pull/153) [`2546790`](https://github.com/Effect-TS/io/commit/2546790c16e04bbe602565bd1d3f3b948d31c49c) Thanks [@IMax153](https://github.com/IMax153)! - use \_tag over op for internal testing data types

- [#153](https://github.com/Effect-TS/io/pull/153) [`05cb45a`](https://github.com/Effect-TS/io/commit/05cb45a1697cc9e9f1d4b18a7cffcb4119e5878d) Thanks [@IMax153](https://github.com/IMax153)! - use \_tag over op in FiberId

- [#153](https://github.com/Effect-TS/io/pull/153) [`6f2f6a2`](https://github.com/Effect-TS/io/commit/6f2f6a283df47963130bf99e5210801118a2e204) Thanks [@IMax153](https://github.com/IMax153)! - prefer \_tag over op for Schedule.Decision

- [#153](https://github.com/Effect-TS/io/pull/153) [`99018af`](https://github.com/Effect-TS/io/commit/99018afc1a494e533e0d915ff821e4100cf20476) Thanks [@IMax153](https://github.com/IMax153)! - use \_tag over op for Effect/Exit

- [#151](https://github.com/Effect-TS/io/pull/151) [`7c39d11`](https://github.com/Effect-TS/io/commit/7c39d1152453b8c620cee2af85d7a8bec9608b1b) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix OOM in FiberRefs

- [#153](https://github.com/Effect-TS/io/pull/153) [`b5c0b24`](https://github.com/Effect-TS/io/commit/b5c0b242a5354cc0db1c1a275d69dfb486aec903) Thanks [@IMax153](https://github.com/IMax153)! - use \_tag over op for ExecutionStrategy

- [#153](https://github.com/Effect-TS/io/pull/153) [`ca6c993`](https://github.com/Effect-TS/io/commit/ca6c993b938978cc1c357bd68389e8ec97cb10a1) Thanks [@IMax153](https://github.com/IMax153)! - use \_tag over op for Config

- [#153](https://github.com/Effect-TS/io/pull/153) [`9c33eb1`](https://github.com/Effect-TS/io/commit/9c33eb1378184d1d14cf4e61ec7982bc9847b63f) Thanks [@IMax153](https://github.com/IMax153)! - use \_tag over op in FiberStatus

- [#153](https://github.com/Effect-TS/io/pull/153) [`dc8d86c`](https://github.com/Effect-TS/io/commit/dc8d86c5a3e98905461b266a9e8a9f64e3448d8e) Thanks [@IMax153](https://github.com/IMax153)! - use \_tag over op for Layer

- [#153](https://github.com/Effect-TS/io/pull/153) [`5f55b31`](https://github.com/Effect-TS/io/commit/5f55b317b3029c9a7f861d4c90a1bf1515e29a46) Thanks [@IMax153](https://github.com/IMax153)! - use \_tag over op for Patch datatypes

## 0.0.50

### Patch Changes

- [#149](https://github.com/Effect-TS/io/pull/149) [`b45646b`](https://github.com/Effect-TS/io/commit/b45646b820b665620d025952bb4fb584b9cdf885) Thanks [@IMax153](https://github.com/IMax153)! - upgrade dependencies

## 0.0.49

### Patch Changes

- [#147](https://github.com/Effect-TS/io/pull/147) [`11d3eaa`](https://github.com/Effect-TS/io/commit/11d3eaa0cd2e856ff475308d9ff27cb82ad8fa62) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix OOM in RingBuffer, improve structure

## 0.0.48

### Patch Changes

- [#145](https://github.com/Effect-TS/io/pull/145) [`9cf3e68`](https://github.com/Effect-TS/io/commit/9cf3e681ea5ac3de7608d58c18b593d83797dc23) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Make FiberRef API pipeable on the return type

- [#143](https://github.com/Effect-TS/io/pull/143) [`728e48c`](https://github.com/Effect-TS/io/commit/728e48c3008d4da51d619d1ff338d08d4833375c) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Revise default logger, make minimumLogLevel configurable

## 0.0.47

### Patch Changes

- [#140](https://github.com/Effect-TS/io/pull/140) [`8ed2101`](https://github.com/Effect-TS/io/commit/8ed2101894ab932963b416aee8880ea7d91d3058) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add Fiber.unsafeRoots

## 0.0.46

### Patch Changes

- [#139](https://github.com/Effect-TS/io/pull/139) [`d04b063`](https://github.com/Effect-TS/io/commit/d04b06366d1466ae8eac933a5593f42afb1273d8) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add Logger.make

- [#139](https://github.com/Effect-TS/io/pull/139) [`18668e4`](https://github.com/Effect-TS/io/commit/18668e436ba55d3928cbea449e1b1a042fb8f43f) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Expose unsafeRootFibers

- [#137](https://github.com/Effect-TS/io/pull/137) [`53e13c5`](https://github.com/Effect-TS/io/commit/53e13c5e9d028f01f33743cf592615828b390d61) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve Effect.unsafeRun typing

## 0.0.45

### Patch Changes

- [#135](https://github.com/Effect-TS/io/pull/135) [`1acb36b`](https://github.com/Effect-TS/io/commit/1acb36be8449be65ca972ed275a543f13292309c) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Avoid useless checks in Semaphore

## 0.0.44

### Patch Changes

- [#133](https://github.com/Effect-TS/io/pull/133) [`b93eb0d`](https://github.com/Effect-TS/io/commit/b93eb0defd6a0991920cbfbffedc324aa2521bf9) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix Lock, extend Lock to be Semaphore

## 0.0.43

### Patch Changes

- [#132](https://github.com/Effect-TS/io/pull/132) [`cacde86`](https://github.com/Effect-TS/io/commit/cacde860c7a877d0d59faf130e1dd610ed4dd290) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve Runtime, remove redundancy add Either variants

- [#128](https://github.com/Effect-TS/io/pull/128) [`f248a7b`](https://github.com/Effect-TS/io/commit/f248a7b7eae7db0ef4d5a68e24d15276dcdf0f88) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add Type Extractors to Layer and Effect

- [#130](https://github.com/Effect-TS/io/pull/130) [`4a64084`](https://github.com/Effect-TS/io/commit/4a64084f86d25d0f2e3db5503e90c069045d7f62) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Align naming of fold to match & reduce

## 0.0.42

### Patch Changes

- [#126](https://github.com/Effect-TS/io/pull/126) [`a8c216f`](https://github.com/Effect-TS/io/commit/a8c216f97de59463b3059b129e6442ada1fbb714) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix ByRef Equality

## 0.0.41

### Patch Changes

- [#122](https://github.com/Effect-TS/io/pull/122) [`9f289e2`](https://github.com/Effect-TS/io/commit/9f289e2f2426afa0aadfb89aaef1644e2b87ae86) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Simplify asyncInterrupt and add asyncInterruptEither

- [#122](https://github.com/Effect-TS/io/pull/122) [`a728c33`](https://github.com/Effect-TS/io/commit/a728c3315017bc5432367c61de3ed94db0bc6326) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Rename promiseAbort variants to promiseInterrupt

- [#124](https://github.com/Effect-TS/io/pull/124) [`c8f6f1b`](https://github.com/Effect-TS/io/commit/c8f6f1b1b079faa974534c99633056de32adcd9a) Thanks [@IMax153](https://github.com/IMax153)! - fix SynchronizedRef.modify

- [#125](https://github.com/Effect-TS/io/pull/125) [`a909e80`](https://github.com/Effect-TS/io/commit/a909e809b7156ee2dc65d656a862cce486935281) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve lock

## 0.0.40

### Patch Changes

- [#121](https://github.com/Effect-TS/io/pull/121) [`d7cf2b2`](https://github.com/Effect-TS/io/commit/d7cf2b29b50b2cde9e9266a3347586a23682df42) Thanks [@IMax153](https://github.com/IMax153)! - expose Synchronized variance

- [#118](https://github.com/Effect-TS/io/pull/118) [`5441c12`](https://github.com/Effect-TS/io/commit/5441c12bbf095dde4dd9788534dfa558832ff29a) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix Layer.foldCauseLayer signature

## 0.0.39

### Patch Changes

- [#115](https://github.com/Effect-TS/io/pull/115) [`70d73b6`](https://github.com/Effect-TS/io/commit/70d73b6bcfc9884c057c74b693dc0e030f402d90) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Change signature of Effect.raceAll to raise a defect on empty

- [#117](https://github.com/Effect-TS/io/pull/117) [`fb749ab`](https://github.com/Effect-TS/io/commit/fb749abe5f1e180b737581388e0e4c30b38495b1) Thanks [@IMax153](https://github.com/IMax153)! - add Cause.flipCauseOption

## 0.0.38

### Patch Changes

- [#113](https://github.com/Effect-TS/io/pull/113) [`c8898e4`](https://github.com/Effect-TS/io/commit/c8898e4917963bb3d477ea5dbed7634defce78e4) Thanks [@IMax153](https://github.com/IMax153)! - fix implementation of Effect.takeWhile

## 0.0.37

### Patch Changes

- [#111](https://github.com/Effect-TS/io/pull/111) [`ca7719a`](https://github.com/Effect-TS/io/commit/ca7719ab0a68e00f3a9cb04f9a82518f3303fd8e) Thanks [@IMax153](https://github.com/IMax153)! - add Effect.dropUntil

## 0.0.36

### Patch Changes

- [#108](https://github.com/Effect-TS/io/pull/108) [`fca450f`](https://github.com/Effect-TS/io/commit/fca450f7bb510f483ececad28f329e122fdf48ca) Thanks [@IMax153](https://github.com/IMax153)! - expose Scheduler

- [#109](https://github.com/Effect-TS/io/pull/109) [`7c1f086`](https://github.com/Effect-TS/io/commit/7c1f086391ecbc2b4333c00f90cf6f4721046a7f) Thanks [@IMax153](https://github.com/IMax153)! - fix Queue method signatures

## 0.0.35

### Patch Changes

- [#106](https://github.com/Effect-TS/io/pull/106) [`9d43955`](https://github.com/Effect-TS/io/commit/9d439557ca762fc9558b0b4c6ba8c81ddf30a7b3) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Weaken cast to satisfy stm

## 0.0.34

### Patch Changes

- [#104](https://github.com/Effect-TS/io/pull/104) [`bd05241`](https://github.com/Effect-TS/io/commit/bd05241208fc1ec83c3aff98f287ecf7007d588d) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix configProvider, avoid depending on external types

## 0.0.33

### Patch Changes

- [#103](https://github.com/Effect-TS/io/pull/103) [`48aa63a`](https://github.com/Effect-TS/io/commit/48aa63ad4746747e98d53781230bfd9207d87ea4) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add promise with abort variants

- [#103](https://github.com/Effect-TS/io/pull/103) [`e4183ec`](https://github.com/Effect-TS/io/commit/e4183ec3712f83f2e895ee676fd29ad1bc3b61f8) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Remove dependency on List

- [#102](https://github.com/Effect-TS/io/pull/102) [`73f91e7`](https://github.com/Effect-TS/io/commit/73f91e7351fa5c0e665f5b2f025defca8e100be7) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Unbundle printer and SafeEval, expose Runtime to Logger

- [#98](https://github.com/Effect-TS/io/pull/98) [`edde247`](https://github.com/Effect-TS/io/commit/edde247c385a7c4288203b478c0c6380e22d6612) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Perf: Remove Stack

- [#103](https://github.com/Effect-TS/io/pull/103) [`e4183ec`](https://github.com/Effect-TS/io/commit/e4183ec3712f83f2e895ee676fd29ad1bc3b61f8) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Remove dependency on WeakIterableMap

- [#101](https://github.com/Effect-TS/io/pull/101) [`f57ddf2`](https://github.com/Effect-TS/io/commit/f57ddf2ad783612fc173ffd2e90b8adba2e30fe5) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Dedupe Runtime Fork Logic

- [#100](https://github.com/Effect-TS/io/pull/100) [`902d847`](https://github.com/Effect-TS/io/commit/902d847a101d788698dad5fc8853a3875dbc1784) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Replace Semaphore with highly performant lock

## 0.0.32

### Patch Changes

- [#96](https://github.com/Effect-TS/io/pull/96) [`806d075`](https://github.com/Effect-TS/io/commit/806d0750690fc7b990ec036cc2df24135f0641c3) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve semver ranges

## 0.0.31

### Patch Changes

- [#95](https://github.com/Effect-TS/io/pull/95) [`2dfe6e4`](https://github.com/Effect-TS/io/commit/2dfe6e4739b65f7a1ec9b8a2babaeac8db4f8cc9) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update dependencies

- [#94](https://github.com/Effect-TS/io/pull/94) [`88d5b06`](https://github.com/Effect-TS/io/commit/88d5b06513a1189bedd8084416b14ea6be5225c0) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve priority naming

- [#92](https://github.com/Effect-TS/io/pull/92) [`904b82e`](https://github.com/Effect-TS/io/commit/904b82e04a36b46118e6e5e196a22efd669847e0) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Expose Schedulers

## 0.0.30

### Patch Changes

- [#90](https://github.com/Effect-TS/io/pull/90) [`e550a1f`](https://github.com/Effect-TS/io/commit/e550a1f42d23be7e80850152bc361571617ab8e3) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update dependencies and improve docs

## 0.0.29

### Patch Changes

- [#89](https://github.com/Effect-TS/io/pull/89) [`db4a8bc`](https://github.com/Effect-TS/io/commit/db4a8bc6536b9c88b6dbf6d4a1319a947e0803fa) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Change design of STM.withJournal and STMDriver

- [#86](https://github.com/Effect-TS/io/pull/86) [`d928327`](https://github.com/Effect-TS/io/commit/d9283274e3b1e2f0e7c07e6015774e1ff31d134b) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Integrate tracing in STM

- [#89](https://github.com/Effect-TS/io/pull/89) [`0ffff27`](https://github.com/Effect-TS/io/commit/0ffff27d7270378341caec75e4859c02a0bb9460) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Simplify STM branching

## 0.0.28

### Patch Changes

- [`1365ebd`](https://github.com/Effect-TS/io/commit/1365ebdfa2d5976697fe1035e21b6f6c207e14a6) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update dependencies

## 0.0.27

### Patch Changes

- [#82](https://github.com/Effect-TS/io/pull/82) [`7267bc7`](https://github.com/Effect-TS/io/commit/7267bc7ffbd36c5211695c8bdaf961b9deb87aa3) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Optimize runLoop

- [#84](https://github.com/Effect-TS/io/pull/84) [`d2577c3`](https://github.com/Effect-TS/io/commit/d2577c387a6285fe646ffe5c9dd4b0306b2a612e) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add function table for drainQueueWhileRunning

## 0.0.26

### Patch Changes

- [#79](https://github.com/Effect-TS/io/pull/79) [`97d3364`](https://github.com/Effect-TS/io/commit/97d3364174898a10e66cd420daece4d33637e0a3) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Resume on fork instead of start

## 0.0.25

### Patch Changes

- [#77](https://github.com/Effect-TS/io/pull/77) [`6c3f8f0`](https://github.com/Effect-TS/io/commit/6c3f8f0a59e47e24b683ba1e034ad57b4f9ff9c1) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add fibers to global scope before start

## 0.0.24

### Patch Changes

- [#75](https://github.com/Effect-TS/io/pull/75) [`395a8e5`](https://github.com/Effect-TS/io/commit/395a8e59af6c2711deb895485bc270eb5e052117) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update dependencies

## 0.0.23

### Patch Changes

- [#73](https://github.com/Effect-TS/io/pull/73) [`5e22bf7`](https://github.com/Effect-TS/io/commit/5e22bf7fcf57d2bf76c08ce87561d71c7e0f02b7) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Track fibers globally

## 0.0.22

### Patch Changes

- [#71](https://github.com/Effect-TS/io/pull/71) [`dc3beb7`](https://github.com/Effect-TS/io/commit/dc3beb703e2122f1208f4cac90c44b37308f4b49) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Switch to compile time debugger

## 0.0.21

### Patch Changes

- [#69](https://github.com/Effect-TS/io/pull/69) [`ccfdc6a`](https://github.com/Effect-TS/io/commit/ccfdc6af6a68d10bc4736baf1749fbf4235011bf) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Readd debugAs

## 0.0.20

### Patch Changes

- [#66](https://github.com/Effect-TS/io/pull/66) [`aa9d97d`](https://github.com/Effect-TS/io/commit/aa9d97d63758cd7f1ad205d024043f2eee2abdaf) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Debug config based on FiberRef

- [#36](https://github.com/Effect-TS/io/pull/36) [`e9c8092`](https://github.com/Effect-TS/io/commit/e9c809292102ffa4de8bd31d83b7916bf05fa636) Thanks [@IMax153](https://github.com/IMax153)! - add Config api

- [#68](https://github.com/Effect-TS/io/pull/68) [`333ea04`](https://github.com/Effect-TS/io/commit/333ea047d33e4aeeeb51ecbee5acfbd8b6a35c46) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix source maps

- [#36](https://github.com/Effect-TS/io/pull/36) [`6dc2a16`](https://github.com/Effect-TS/io/commit/6dc2a16f2893e6c4fb144a5444f82f7ae9b52617) Thanks [@IMax153](https://github.com/IMax153)! - Add default ConfigProvider

## 0.0.19

### Patch Changes

- [#63](https://github.com/Effect-TS/io/pull/63) [`43d7db1`](https://github.com/Effect-TS/io/commit/43d7db1d69cad9cbb51262d86e01e6d316fc6b1f) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Support execution debugging

## 0.0.18

### Patch Changes

- [#61](https://github.com/Effect-TS/io/pull/61) [`8953fd7`](https://github.com/Effect-TS/io/commit/8953fd7cbbb11216dc22e25f8027ef627677424d) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve Debug Config

## 0.0.17

### Patch Changes

- [#58](https://github.com/Effect-TS/io/pull/58) [`5c982f9`](https://github.com/Effect-TS/io/commit/5c982f91ec7892e18b3b0a78a791bbdaaa4e3b47) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix log level override

## 0.0.16

### Patch Changes

- [#56](https://github.com/Effect-TS/io/pull/56) [`0defe90`](https://github.com/Effect-TS/io/commit/0defe902be07a2242acfd850d325714fc1705e22) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update @fp-ts/data

## 0.0.15

### Patch Changes

- [#53](https://github.com/Effect-TS/io/pull/53) [`5393109`](https://github.com/Effect-TS/io/commit/53931093809df1de115636d35744f2c1867ff211) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Isolate Debug from LogLevel

## 0.0.14

### Patch Changes

- [#51](https://github.com/Effect-TS/io/pull/51) [`76f1e22`](https://github.com/Effect-TS/io/commit/76f1e228a0da8aea8b704553ea60bf56ca67c7be) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Cleanup Cause

## 0.0.13

### Patch Changes

- [#49](https://github.com/Effect-TS/io/pull/49) [`3d2fd3b`](https://github.com/Effect-TS/io/commit/3d2fd3b5a8d95d016f60704e0aaf04632bfa9fb2) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Set default logger to be console

## 0.0.12

### Patch Changes

- [#47](https://github.com/Effect-TS/io/pull/47) [`d010db0`](https://github.com/Effect-TS/io/commit/d010db00676d2470f08df89061dd83be23ee5c8f) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update dependencies

## 0.0.11

### Patch Changes

- [#45](https://github.com/Effect-TS/io/pull/45) [`ab078fb`](https://github.com/Effect-TS/io/commit/ab078fb20d952d3eda86355083266f97ae39f6b5) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Curry provideService and provideServiceEffect

## 0.0.10

### Patch Changes

- [#43](https://github.com/Effect-TS/io/pull/43) [`fb2f0cb`](https://github.com/Effect-TS/io/commit/fb2f0cb496af0862010935da45399b53a3253ec6) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update dependencies

## 0.0.9

### Patch Changes

- [#41](https://github.com/Effect-TS/io/pull/41) [`02b7ec0`](https://github.com/Effect-TS/io/commit/02b7ec0ba8ac1c780855aaea64fd40d67819cd33) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Rollback adapter removal

## 0.0.8

### Patch Changes

- [#39](https://github.com/Effect-TS/io/pull/39) [`19c8309`](https://github.com/Effect-TS/io/commit/19c8309d67b5390be88adc1c36310a92622fe062) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix Internal Types Again

## 0.0.7

### Patch Changes

- [#37](https://github.com/Effect-TS/io/pull/37) [`3dbcb37`](https://github.com/Effect-TS/io/commit/3dbcb375d447552a10b1225929abe90ce0669eaf) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix internal types

## 0.0.6

### Patch Changes

- [#34](https://github.com/Effect-TS/io/pull/34) [`b911229`](https://github.com/Effect-TS/io/commit/b91122989c3a516bc7185a4579a056a967e3e2c7) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix Cause Rendering

- [#33](https://github.com/Effect-TS/io/pull/33) [`86deebb`](https://github.com/Effect-TS/io/commit/86deebb968b127cde3b2720d0a1098ba311cdf2f) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve trace gluing

- [#31](https://github.com/Effect-TS/io/pull/31) [`efcd6ac`](https://github.com/Effect-TS/io/commit/efcd6ac0d1e773706bd2c0c956940e680d053f26) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Merge Stack Annotations in Cause Render

## 0.0.5

### Patch Changes

- [#26](https://github.com/Effect-TS/io/pull/26) [`6538300`](https://github.com/Effect-TS/io/commit/653830005f50c3b6e005dc15f2b7a6f9b8f091b8) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix Cause.find on Parallel/Sequential

- [#25](https://github.com/Effect-TS/io/pull/25) [`a0ff508`](https://github.com/Effect-TS/io/commit/a0ff5087f717f6e027a246024ab49ae6788ce2ef) Thanks [@IMax153](https://github.com/IMax153)! - add additional effect methods

- [#28](https://github.com/Effect-TS/io/pull/28) [`a8aecbc`](https://github.com/Effect-TS/io/commit/a8aecbcc72b73c59b762c08b6783bd768bb23c44) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Preserve Stack Annotations when patching flags

## 0.0.4

### Patch Changes

- [#22](https://github.com/Effect-TS/io/pull/22) [`f1d781c`](https://github.com/Effect-TS/io/commit/f1d781c21fbd3a55f75b3da6a75c7c75b9146397) Thanks [@IMax153](https://github.com/IMax153)! - fix Cause.flatMap and Cause.map

- [#24](https://github.com/Effect-TS/io/pull/24) [`60a44d8`](https://github.com/Effect-TS/io/commit/60a44d8708fa8dba7387797c8343c7b5cea93f71) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix Cause.as

## 0.0.3

### Patch Changes

- [#17](https://github.com/Effect-TS/io/pull/17) [`8891d12`](https://github.com/Effect-TS/io/commit/8891d1244e37cc6dab123b0b2e4617333d8a9206) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Support Tag in Gen

- [#20](https://github.com/Effect-TS/io/pull/20) [`9ea5b01`](https://github.com/Effect-TS/io/commit/9ea5b01b1c9239b8f2e7dd78571acde12c16bc5d) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Rollback Tag Support

## 0.0.2

### Patch Changes

- [#8](https://github.com/Effect-TS/io/pull/8) [`d07fd73`](https://github.com/Effect-TS/io/commit/d07fd7352ad80d2a9db9bac8899b0b69dfe52125) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Integrate Tracing

- [#12](https://github.com/Effect-TS/io/pull/12) [`20f6d0b`](https://github.com/Effect-TS/io/commit/20f6d0b27e7b52ad146737a44d2e4f5e8872f6c4) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Trace withSpan

## 0.0.1

### Patch Changes

- [#5](https://github.com/Effect-TS/io/pull/5) [`dfaf233`](https://github.com/Effect-TS/io/commit/dfaf233152f19cfd254e3a9678da305bb5038a10) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update fp-ts
