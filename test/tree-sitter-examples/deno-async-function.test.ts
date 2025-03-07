import { assertEquals } from '@std/assert';

Deno.test(async function DenoAsyncFunction() {
    await Promise.resolve();
    assertEquals(1, 1);
});

