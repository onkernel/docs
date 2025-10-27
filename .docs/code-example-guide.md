# Code Example Standards

This guide defines the standards for code examples across the Kernel documentation.

## General Principles

1. **Complete and runnable**: Every code example should be complete enough to run as-is
2. **Consistent naming**: Use standardized variable names across all examples
3. **No hardcoded credentials**: Never include API keys or credentials in examples
4. **Multi-language support**: When applicable, show both TypeScript/JavaScript and Python examples

## Variable Naming Conventions

### TypeScript/JavaScript
- SDK client: `kernel`
- Browser instance: `kernelBrowser`
- Additional browsers: `kernelBrowser2`, `kernelBrowserAuto`, etc.
- Playwright/Puppeteer browser: `browser`
- Context: `context`
- Page: `page`

### Python
- SDK client: `kernel`
- Browser instance: `kernel_browser`
- Additional browsers: `kernel_browser2`, etc.
- Playwright browser: `browser`
- Context: `context`
- Page: `page`

## Code Example Structure

### Minimal Example (Browser Creation)

Always include:
1. Import statement
2. SDK initialization
3. The main operation
4. Return value or console output (when relevant)

<CodeGroup>
```typescript Typescript/Javascript
import Kernel from '@onkernel/sdk';

const kernel = new Kernel();

const kernelBrowser = await kernel.browsers.create();
console.log(kernelBrowser.session_id);
```

```python Python
from kernel import Kernel

kernel = Kernel()

kernel_browser = kernel.browsers.create()
print(kernel_browser.session_id)
```
</CodeGroup>

### Full Example (With Browser Automation)

For examples showing browser automation, include:
1. All necessary imports
2. SDK initialization
3. Browser creation
4. CDP connection
5. Browser automation code
6. Error handling (try/finally)
7. Cleanup

<CodeGroup>
```typescript Typescript/Javascript
import Kernel from '@onkernel/sdk';
import { chromium } from 'playwright';

const kernel = new Kernel();

const kernelBrowser = await kernel.browsers.create();
const browser = await chromium.connectOverCDP(kernelBrowser.cdp_ws_url);

try {
  const context = browser.contexts()[0] || (await browser.newContext());
  const page = context.pages()[0] || (await context.newPage());
  await page.goto('https://www.onkernel.com');
  const title = await page.title();
  console.log(title);
} catch (error) {
  console.error(error);
} finally {
  await browser.close();
  await kernel.browsers.deleteByID(kernelBrowser.session_id);
}
```

```python Python
from kernel import Kernel
from playwright.async_api import async_playwright

kernel = Kernel()

kernel_browser = kernel.browsers.create()

async with async_playwright() as playwright:
    browser = await playwright.chromium.connect_over_cdp(kernel_browser.cdp_ws_url)
    context = browser.contexts[0] if browser.contexts else await browser.new_context()
    page = context.pages[0] if context.pages else await context.new_page()

    try:
        await page.goto('https://www.onkernel.com')
        title = await page.title()
        print(title)
    except Exception as e:
        print(e)
    finally:
        await browser.close()
        await kernel.browsers.delete_by_id(kernel_browser.session_id)
```
</CodeGroup>

## SDK Initialization

### ✅ Correct - No hardcoded credentials

```typescript
const kernel = new Kernel();
```

```python
kernel = Kernel()
```

The SDK automatically reads the API key from the `KERNEL_API_KEY` environment variable.

### ❌ Incorrect - Hardcoded credentials

```typescript
// DON'T DO THIS
const kernel = new Kernel({ apiKey: 'your-api-key' });
const kernel = new Kernel({ apiKey: process.env.KERNEL_API_KEY });
```

```python
# DON'T DO THIS
kernel = Kernel(api_key="your-api-key")
kernel = Kernel(api_key=os.getenv("KERNEL_API_KEY"))
```

## Feature-Specific Examples

### Simple Feature Toggle

For simple feature flags (stealth, headless, etc.):

<CodeGroup>
```typescript Typescript/Javascript
import Kernel from '@onkernel/sdk';

const kernel = new Kernel();

const kernelBrowser = await kernel.browsers.create({
  stealth: true,
});
```

```python Python
from kernel import Kernel

kernel = Kernel()

kernel_browser = kernel.browsers.create(
    stealth=True,
)
```
</CodeGroup>

### Feature with Configuration

For features requiring configuration objects:

<CodeGroup>
```typescript Typescript/Javascript
import Kernel from '@onkernel/sdk';

const kernel = new Kernel();

const kernelBrowser = await kernel.browsers.create({
  stealth: true
});
```

```python Python
from kernel import Kernel

kernel = Kernel()

kernel_browser = kernel.browsers.create(
    stealth=True
)
```
</CodeGroup>

## App Development Examples

For Kernel app examples, follow this pattern:

<CodeGroup>
```typescript Typescript/Javascript
import Kernel, { type KernelContext } from '@onkernel/sdk';
import { chromium } from 'playwright';

const kernel = new Kernel();
const app = kernel.app('my-app-name');

app.action('action-name', async (ctx: KernelContext, payload) => {
  const kernelBrowser = await kernel.browsers.create({
    invocation_id: ctx.invocation_id,
  });

  const browser = await chromium.connectOverCDP(kernelBrowser.cdp_ws_url);
  const context = browser.contexts()[0] || (await browser.newContext());
  const page = context.pages()[0] || (await context.newPage());

  try {
    // Your action logic here
    return { result: 'success' };
  } finally {
    await browser.close();
  }
});
```

```python Python
import kernel
from kernel import Kernel
from playwright.async_api import async_playwright

kernel = Kernel()
app = kernel.App("my-app-name")

@app.action("action-name")
async def action_method(ctx: kernel.KernelContext, payload):
    kernel_browser = kernel.browsers.create(invocation_id=ctx.invocation_id)

    async with async_playwright() as playwright:
        browser = await playwright.chromium.connect_over_cdp(kernel_browser.cdp_ws_url)
        context = browser.contexts[0] if browser.contexts else await browser.new_context()
        page = context.pages[0] if context.pages else await context.new_page()

        try:
            # Your action logic here
            return {"result": "success"}
        finally:
            await browser.close()
```
</CodeGroup>

## Common Patterns

### Pattern: Context and Page Access

Kernel browsers launch with a default context and page. Always use this pattern:

```typescript
const context = browser.contexts()[0] || (await browser.newContext());
const page = context.pages()[0] || (await context.newPage());
```

```python
context = browser.contexts[0] if browser.contexts else await browser.new_context()
page = context.pages[0] if context.pages else await context.new_page()
```

### Pattern: Error Handling

Always include proper error handling:

```typescript
try {
  // Your automation code
} catch (error) {
  console.error(error);
} finally {
  await browser.close();
  await kernel.browsers.deleteByID(kernelBrowser.session_id);
}
```

```python
try:
    # Your automation code
except Exception as e:
    print(e)
finally:
    await browser.close()
    await kernel.browsers.delete_by_id(kernel_browser.session_id)
```

## Code Formatting

### Indentation
- TypeScript/JavaScript: 2 spaces
- Python: 4 spaces

### String Quotes
- TypeScript/JavaScript: Single quotes `'` (except for avoiding escaping)
- Python: Double quotes `"`

### Line Length
- Keep lines under 100 characters when possible
- Break long parameter lists across multiple lines

### Comments
- Use comments sparingly - code should be self-explanatory
- Add comments only for non-obvious logic or important context
- Never add comments like "NEW CODE:" or similar meta-comments

## URL and Placeholder Formatting

### URLs with Placeholders
Use angle brackets for placeholders:
```
https://api.onkernel.com/browser/live/<TOKEN>?readOnly=true
```

### IDs in Code
Use descriptive strings:
```typescript
await kernel.browsers.deleteByID('session_id');
```

## Multi-Language CodeGroups

Always use `<CodeGroup>` with proper language labels:

```markdown
<CodeGroup>
```typescript Typescript/Javascript
// TypeScript code here
```

```python Python
# Python code here
```
</CodeGroup>
```

## Checklist

Before publishing a code example, verify:

- [ ] Includes all necessary imports
- [ ] SDK is initialized without hardcoded API keys
- [ ] Variable names follow conventions
- [ ] Code is complete and runnable
- [ ] Includes error handling (for full examples)
- [ ] Includes cleanup code (for full examples)
- [ ] Uses proper indentation and formatting
- [ ] Both TypeScript and Python versions are provided (when applicable)
- [ ] Code has been tested or follows proven patterns

## Reference

See these files for examples:
- `browsers/create-a-browser.mdx` - Standard browser creation pattern
- `apps/develop.mdx` - App development pattern
- `browsers/file-io.mdx` - Complex automation example

