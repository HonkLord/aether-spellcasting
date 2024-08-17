// Register module settings
Hooks.once("init", () => {
  game.settings.register("aether-spellcasting", "enableAetherSpellcasting", {
    name: "Enable Aether Spellcasting",
    hint: "Enable the Aether Spellcasting system",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register("aether-spellcasting", "aetherActors", {
    name: "Actors using Aether Spellcasting",
    hint: "Enter actor names separated by commas",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });
});

Hooks.on("renderAbilityUseDialog", async (app, html, data) => {
  if (!game.settings.get("aether-spellcasting", "enableAetherSpellcasting")) {
    console.log("Aether Spellcasting | Module disabled in settings");
    return;
  }

  let actor = app.item?.actor;
  if (!actor) {
    console.log("Aether Spellcasting | Actor not found.");
    return;
  }

  const aetherActors = game.settings
    .get("aether-spellcasting", "aetherActors")
    .split(",")
    .map((name) => name.trim());
  if (!aetherActors.includes(actor.name)) {
    console.log(
      `Aether Spellcasting | ${actor.name} is not configured for Aether Spellcasting`
    );
    return;
  }

  console.log("Aether Spellcasting | Modifying dialog for", actor.name);

  // Reorder elements
  const form = html.find("form");
  const castAtLevelGroup = html
    .find('select[name="slotLevel"]')
    .closest(".form-group");

  // Move elements in the correct order
  form.prepend(castAtLevelGroup);

  // Hide the "Consume Spell Slot?" checkbox
  html
    .find('input[name="consumeSpellSlot"]')
    .prop("checked", false)
    .parent()
    .parent()
    .hide();

  // Create a container for the two-column layout
  const twoColumnContainer = $(`
  <div class="form-group aether-spellcasting-container" style="display: flex; justify-content: space-between; margin-top: 10px;">
    <div class="aether-spellcasting-column" style="width: 48%;">
      <label>Spell Slot to Use:</label>
      <select name="custom-spell-slot" style="width: 100%;">
      </select>
    </div>
    <div class="aether-spellcasting-column" style="width: 48%;">
      <label>Aether Points to Use:</label>
      <select name="custom-aether-points" style="width: 100%;">
      </select>
    </div>
  </div>
`);

  // Insert the two-column container after the castAtLevelGroup
  castAtLevelGroup.after(twoColumnContainer);

  // Find the configure text
  const configureText = html.find(
    'p:contains("Configure how you would like to use")'
  );

  if (configureText.length) {
    // Move the configure text above the two-column container
    twoColumnContainer.before(configureText);

    // Add some styling to make it stand out
    configureText.css({
      "margin-bottom": "10px",
      "font-weight": "bold",
    });

    console.log("Aether Spellcasting | Moved configure text");
  } else {
    console.log("Aether Spellcasting | Configure text not found");
  }

  // Add error message area
  twoColumnContainer.after(
    '<p id="resource-error" style="color: red; margin-top: 10px; display: none;">Error: Resources do not match the spell level.</p>'
  );

  // Adjust CSS to prevent scrollbox
  html.css({
    height: "auto",
    "max-height": "none",
  });

  html.parent().css({
    height: "auto",
    "max-height": "none",
  });

  // Function to parse the spell level
  function parseSpellLevel(levelText) {
    const match = levelText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  // Function to update Spell Slot dropdown
  function updateSpellSlotDropdown() {
    const castAtLevel = parseSpellLevel(
      html.find('select[name="slotLevel"] option:selected').text()
    );
    let spellSlotOptions = `<option value="0">No Spell Slot</option>`;
    for (let i = 1; i <= castAtLevel; i++) {
      const spellSlotKey = `spell${i}`;
      if (actor.system.spells[spellSlotKey]?.value > 0) {
        spellSlotOptions += `<option value="${i}" ${
          i === castAtLevel ? "selected" : ""
        }>Level ${i} (${
          actor.system.spells[spellSlotKey].value
        } Slots)</option>`;
      }
    }
    html.find('select[name="custom-spell-slot"]').html(spellSlotOptions);
  }

  // Function to update Aether points dropdown
  function updateAetherDropdown() {
    const castAtLevel = parseSpellLevel(
      html.find('select[name="slotLevel"] option:selected').text()
    );
    const availableAether = actor.system.resources.primary.value;
    const maxAether = Math.min(castAtLevel, availableAether);

    let aetherOptions = "";
    for (let i = 0; i <= maxAether; i++) {
      aetherOptions += `<option value="${i}">${i}</option>`;
    }

    const aetherSelect = html.find('select[name="custom-aether-points"]');
    aetherSelect.html(aetherOptions);

    // Update the label
    const aetherLabel = aetherSelect.prev("label");
    aetherLabel.text("Aether Points to Use:");

    // Remove existing battery and info if present
    html.find(".aether-info-container").remove();

    // Create battery-like indicator
    const batteryWidth = 100; // pixels
    const filledWidth =
      (availableAether / actor.system.resources.primary.max) * batteryWidth;
    const batteryHtml = `
    <div class="aether-info-container">
      <div class="aether-battery" style="width: ${batteryWidth}px; height: 10px; background-color: #ddd; border: 1px solid #999;">
        <div style="width: ${filledWidth}px; height: 100%; background-color: #4CAF50;"></div>
      </div>
      <span class="aether-info">Available: ${availableAether}/${actor.system.resources.primary.max}</span>
    </div>
  `;

    // Add new battery indicator and info
    aetherSelect.after(batteryHtml);

    // Apply CSS for alignment (this can be moved to a separate CSS file if preferred)
    html.find(".aether-spellcasting-container").css({
      display: "flex",
      "justify-content": "space-between",
      "align-items": "flex-start",
      "margin-top": "10px",
    });

    html.find(".aether-spellcasting-column").css({
      width: "48%",
      display: "flex",
      "flex-direction": "column",
    });

    html.find(".aether-info-container").css({
      "margin-top": "5px",
      "font-size": "0.9em",
    });

    html.find(".aether-battery").css({
      "margin-bottom": "2px",
    });
  }

  function validateResources() {
    const castAtLevel = parseSpellLevel(
      html.find('select[name="slotLevel"] option:selected').text()
    );
    const spellSlotLevel =
      parseInt(html.find('select[name="custom-spell-slot"]').val()) || 0;
    const aetherPoints =
      parseInt(html.find('select[name="custom-aether-points"]').val()) || 0;

    const totalResources = spellSlotLevel + aetherPoints;
    const isValid = totalResources === castAtLevel;

    const errorElement = html.find("#resource-error");
    if (!isValid) {
      if (totalResources < castAtLevel) {
        errorElement.text(
          `Error: Not enough resources selected. Need ${
            castAtLevel - totalResources
          } more.`
        );
      } else {
        errorElement.text(
          `Error: Too many resources selected. Remove ${
            totalResources - castAtLevel
          }.`
        );
      }
      errorElement.show();
    } else {
      errorElement.hide();
    }

    html.find('button[data-button="cast"]').prop("disabled", !isValid);
  }

  // Add event listeners
  html.find('select[name="slotLevel"]').on("change", function () {
    updateSpellSlotDropdown();
    updateAetherDropdown();
    validateResources();
  });
  html
    .find(
      'select[name="custom-spell-slot"], select[name="custom-aether-points"]'
    )
    .on("change", validateResources);

  // Initial setup
  updateSpellSlotDropdown();
  updateAetherDropdown();
  validateResources();

  // Fix the dialog height
  html.parent().css({
    height: "auto",
    "max-height": "none",
    "overflow-y": "auto",
  });

  app.setPosition({ height: "auto" });

  // Intercept the form submission
  const originalSubmit = app.submit;
  app.submit = async function (button) {
    const castAtLevel = parseSpellLevel(
      html.find('select[name="slotLevel"] option:selected').text()
    );
    const selectedSpellSlot = parseInt(
      html.find('select[name="custom-spell-slot"]').val()
    );
    const selectedAether = parseInt(
      html.find('select[name="custom-aether-points"]').val()
    );

    console.log("Aether Spellcasting | Cast at Level:", castAtLevel);
    console.log(
      "Aether Spellcasting | Selected Spell Slot:",
      selectedSpellSlot
    );
    console.log("Aether Spellcasting | Selected Aether:", selectedAether);

    // Validate resources one last time before submitting
    if (selectedSpellSlot + selectedAether !== castAtLevel) {
      console.error(
        "Aether Spellcasting | Resources do not match spell level."
      );
      ui.notifications.error(
        "Resources do not match spell level. Please adjust your selection."
      );
      return false;
    }

    try {
      // Reduce the selected spell slot if it's not "No Spell Slot"
      if (selectedSpellSlot > 0) {
        const spellSlotField = `system.spells.spell${selectedSpellSlot}.value`;
        let currentSlots =
          actor.system.spells[`spell${selectedSpellSlot}`].value;

        if (currentSlots > 0) {
          await actor.update({ [spellSlotField]: currentSlots - 1 });
        } else {
          console.error(
            "Aether Spellcasting | Not enough spell slots available."
          );
          ui.notifications.error("Not enough spell slots available.");
          return false;
        }
      }

      // Reduce Aether points
      if (selectedAether > 0) {
        const aetherField = `system.resources.primary.value`;
        let currentAether = actor.system.resources.primary.value;

        if (currentAether >= selectedAether) {
          await actor.update({ [aetherField]: currentAether - selectedAether });
        } else {
          console.error(
            "Aether Spellcasting | Not enough Aether points available."
          );
          ui.notifications.error("Not enough Aether points available.");
          return false;
        }
      }

      // Set the spell level for casting
      this.item.system.level = castAtLevel;

      // Call the original submit function
      return await originalSubmit.call(this, button);
    } catch (error) {
      console.error(
        "Aether Spellcasting | Error during spell casting submission:",
        error
      );
      ui.notifications.error(
        "There was an issue with spell casting. Please try again."
      );
      return false;
    }
  };
});
