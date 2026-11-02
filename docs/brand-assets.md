# Fresh Masala campaign branding

The claim pages use the official logo, teal theme colour (`#0da487`), Public Sans
typeface, and product packshots from [Fresh Masala](https://freshmasala.com.np/).
The primary button uses a darker teal for readable white text. Rounded surfaces,
marigold garlands, diyas, and golden petals carry the Tihar treatment.

These images are bundled in `plugins/fm-cash-claims/assets/images/`, so the
customer's claim does not depend on requests to the public website:

| Local file | Original source |
| --- | --- |
| `fresh-masala-logo.png` | [Official logo](https://freshmasala.com.np/wp-content/uploads/2026/08/logo.png) |
| `garam-masala.png` | [Garam Masala](https://freshmasala.com.np/wp-content/uploads/2026/08/garam-removebg-preview-3.png) |
| `momo-masala.png` | [Momo Masala](https://freshmasala.com.np/wp-content/uploads/2026/08/momo-removebg-preview.png) |
| `tea-masala.png` | [Tea Masala](https://freshmasala.com.np/wp-content/uploads/2026/08/tea-removebg-preview.png) |

The PNG files retain the originals' transparency and proportions. The diya and
garland SVGs are drawn for the campaign. The Public Sans Latin variable font is
bundled from [Google Fonts](https://fonts.googleapis.com/css2?family=Public+Sans:wght@400..800&display=swap)
with its SIL Open Font License in `assets/fonts/OFL.txt`.

After a saved claim, three lamps appear, the seal fades, two curtains part, and
the actual amount appears with a short golden petal burst. The sequence lasts
about three seconds and runs once. Reduced motion, JavaScript disabled, and
printing show the saved amount without the animation. The amount remains absent
from the initial form and validation errors.
