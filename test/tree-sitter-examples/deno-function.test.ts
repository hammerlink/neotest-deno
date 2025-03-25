import { assertEquals } from '@std/assert';

Deno.test(function DenoFunction() {
    assertEquals(1, 1);
});

Deno.test(async function DenoAsyncFunction() {
    await Promise.resolve();
    assertEquals(1, 1);
});

Deno.test.ignore(function DenoIgnoredFunction() {
    assertEquals(1, 1);
});

Deno.test.only(function DenoOnlyFunction() {
    assertEquals(1, 1);
});
