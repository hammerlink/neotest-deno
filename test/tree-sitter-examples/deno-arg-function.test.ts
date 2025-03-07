import { assertEquals } from '@std/assert';

Deno.test('DenoArgFunction', function () {
    assertEquals(1, 1);
});
Deno.test('DenoArgAsyncFunction', async function () {
    await Promise.resolve();
    assertEquals(1, 1);
});
Deno.test('DenoArgArrowFunction', () => {
    assertEquals(1, 1);
});
Deno.test('DenoArgArrowAsyncFunction', async () => {
    await Promise.resolve();
    assertEquals(1, 1);
});
