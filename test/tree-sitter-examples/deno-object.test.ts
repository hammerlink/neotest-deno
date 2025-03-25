import { assertEquals } from '@std/assert/equals';

Deno.test.ignore({
    name: 'DenoIgnoreObjectRegularFn',
    fn: function () {
        assertEquals(1, 1);
    },
});
Deno.test({
    name: 'DenoObjectRegularFn',
    fn: function () {
        assertEquals(1, 1);
    },
});
Deno.test({
    name: 'DenoObjectNameFn',
    fn: function MyTest () {
        assertEquals(1, 1);
    },
});

Deno.test({
    name: 'DenoObjectArrowFn',
    fn: () => {
        assertEquals(1, 1);
    },
});

Deno.test({
    name: 'DenoObjectDirectFn',
    fn() {
        assertEquals(1, 1);
    },
});
Deno.test({
    name: 'DenoObjectAsyncDirectFn',
    async fn() {
        await new Promise((resolve) => setTimeout(resolve, 10));
    },
});
