# 3D models for SOLEVERSE

**No 3D model ships with this project.** The viewer is built and ready, but it needs a real sneaker model file.
Until you add one, product pages show the normal photo gallery and the note "3D viewing is not available for this item yet."

## What to add

Put your file here:

```
public/models/sneaker.glb
```

`products.js` already points the **Aero Runner 01** sample product at `/models/sneaker.glb`. To use a different
file name, or to add a model to another product, edit that product's `modelPath` in `src/data/products.js`
(each product needs its OWN model; do not reuse one model for different shoes).

## Model requirements

| Requirement | Why |
| --- | --- |
| Format: **.glb** (binary glTF 2.0) | The viewer loads glTF/GLB files. |
| **Not Draco-compressed** (Meshopt is fine) | Draco needs a decoder downloaded from the internet, which the viewer avoids on purpose. |
| Y axis is "up", shoe roughly centred | glTF standard. If the shoe faces the wrong way, set `modelRotation` (radians), e.g. `[0, Math.PI, 0]`. |
| File size ideally under about 5 MB, textures 2048 px or smaller | Faster loading, smoother mobile performance. |
| Separate materials named for each part (for example `upper`, `sole`, `laces`) | Needed for the colour customiser. Without them the model still displays, but no colour controls appear. |

## Licence: please check before you use any model

- Only use a model whose licence allows your use (for example a shop website). Read the licence on the model's own page.
  Some licences need credit (attribution); some forbid commercial use.
- Do not use models that copy a real brand's shoe design, logo or name.
- A model being free to download does **not** mean it is free for commercial use.
- Good places to look: the Khronos "glTF Sample Assets" collection (each model lists its own licence) and model sites
  that show the licence next to the download. Verify the licence yourself; I could not check any model from here.
- Or commission/make your own and export as `.glb` from Blender (File > Export > glTF 2.0, format "glTF Binary", Draco OFF).

## Making the colour customiser work

1. Open your `.glb` in a viewer such as <https://gltf-viewer.donmccurdy.com> to see the material names, **or** run
   `npm run dev`, open a product page with 3D, and read the browser console line
   `[Shoe3DViewer] material names found in this model: [...]`.
2. In `src/data/products.js`, set each `materialName` in that product's `customizableMaterials` to the real names, e.g.
   `{ id: 'upper', label: 'Upper', materialName: 'Mesh_Upper' }`.
3. Only parts whose material name exists in the model get a colour control. If none match, no customiser is shown.

If your model has only one combined material, you can offer a single control (for example just `upper`).
Do not list parts the model does not really have.
