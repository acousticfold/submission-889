document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("presentation-tab-root");

  if (!root) {
    return;
  }

  root.innerHTML = `
    <div class="presentation-tab">
      <section class="presentation-block">
        <h3>The Challenge of Hebrew Writing</h3>
        <p>Hebrew text often omits phonetic information needed for reliable text-to-speech, creating ambiguity even when the spelling is unchanged.</p>
        <div class="challenge-grid-native">
          <div class="challenge-card-native">
            <h4>Missing Vowels</h4>
            <div class="example-box">Vwls r nt prsnt n ths sntnc</div>
            <p>This illustrates how Hebrew is written.</p>
          </div>
          <div class="challenge-card-native">
            <h4>Unvocalized Hebrew</h4>
            <div class="hebrew-display">ספר</div>
            <p>Multiple valid pronunciations are possible from the same letters.</p>
          </div>
          <div class="challenge-card-native">
            <h4>Different Words, Same Form</h4>
            <div class="pronunciations">
              <div class="pronunciation-row"><strong>/sˈefer/</strong><span>book</span></div>
              <div class="pronunciation-row"><strong>/sapˈar/</strong><span>barber</span></div>
              <div class="pronunciation-row"><strong>/safˈar/</strong><span>he counted</span></div>
            </div>
          </div>
        </div>
      </section>

      <section class="presentation-block">
        <h3>Phonikud: Adding Missing Phonetic Information</h3>
        <p>Phonikud resolves ambiguity by adding missing phonetic details such as stress, producing fully specified phonetic output for downstream TTS.</p>
        <div class="solution-flow">
          <div class="step-card-native">
            <div class="step-badge">1</div>
            <h4>Unvocalized Input</h4>
            <div class="hebrew-display">תרד</div>
            <p>Ambiguous pronunciation.</p>
          </div>
          <div class="step-card-native">
            <div class="step-badge">2</div>
            <h4>Vocalized Form</h4>
            <div class="hebrew-display">תֶּרֶד</div>
            <p>Vowels are added, but stress is still underspecified.</p>
          </div>
          <div class="step-card-native">
            <div class="step-badge">3</div>
            <h4>Enhanced Output</h4>
            <div class="hebrew-display">תֶּ֫רֶד</div>
            <div class="phonetic-result-native">/tˈeʁed/</div>
            <p>Pronunciation is fully specified.</p>
          </div>
        </div>
      </section>
    </div>
  `;
});
