/**
 * aiExplainer.js
 * Automated Tamil Voice & Text Concept Explainer
 * Integrates Web Speech API (ta-IN) and Gemini 1.5 Flash API with Samacheer Kalvi fallbacks.
 */

import { calculateOptics } from './opticsMath.js';

class AIExplainer {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.tamilVoice = null;
    this.isSpeaking = false;
    this.geminiApiKey = typeof localStorage !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY') || '' : '';
    this.subscribers = new Set();
    this.currentUtterance = null;

    if (this.synth) {
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  initVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Prioritize Tamil voices (ta-IN, ta_IN, or containing Tamil)
    this.tamilVoice = voices.find(v => 
      v.lang.toLowerCase() === 'ta-in' || 
      v.lang.toLowerCase().startsWith('ta') || 
      v.name.toLowerCase().includes('tamil') ||
      v.name.includes('தமிழ்')
    ) || null;

    if (this.tamilVoice) {
      console.log('✓ Found Tamil Speech Voice:', this.tamilVoice.name, this.tamilVoice.lang);
    } else {
      console.warn('Tamil voice not found in browser speech synthesis. Fallback display will be used.');
    }
  }

  setGeminiApiKey(key) {
    this.geminiApiKey = (key || '').trim();
    if (typeof localStorage !== 'undefined') {
      if (this.geminiApiKey) {
        localStorage.setItem('GEMINI_API_KEY', this.geminiApiKey);
      } else {
        localStorage.removeItem('GEMINI_API_KEY');
      }
    }
    this.notify({ type: 'api_key_changed', hasKey: Boolean(this.geminiApiKey) });
  }

  getGeminiApiKey() {
    return this.geminiApiKey || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '';
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify(event) {
    for (const callback of this.subscribers) {
      try {
        callback(event);
      } catch (err) {
        console.error('Error notifying subscriber:', err);
      }
    }
  }

  /**
   * Explain current optical state
   * @param {number} u - Object distance in cm
   */
  async explainConcept(u) {
    const optics = calculateOptics(u);
    this.stopSpeaking();

    let explanationTextTa = optics.spokenScriptTa;
    let isFromAI = false;

    const apiKey = this.getGeminiApiKey();
    if (apiKey) {
      this.notify({ type: 'ai_loading', status: true });
      try {
        const aiText = await this.fetchGeminiExplanation(optics, apiKey);
        if (aiText && aiText.trim().length > 10) {
          explanationTextTa = aiText.trim();
          isFromAI = true;
        }
      } catch (err) {
        console.warn('Gemini API call failed, falling back to textbook preset:', err);
      } finally {
        this.notify({ type: 'ai_loading', status: false });
      }
    }

    // Broadcast explanation update to UI
    this.notify({
      type: 'explanation_ready',
      optics,
      textTa: explanationTextTa,
      textEn: `${optics.stateTitleEn}: Image is formed ${optics.imagePosEn}, ${optics.natureEn}, ${optics.sizeEn}. Common application: ${optics.applicationEn}.`,
      isFromAI
    });

    // Speak aloud via Web Speech API
    this.speakTamil(explanationTextTa);
  }

  /**
   * Call Gemini 1.5 Flash API for conversational physics explanation in Tamil
   */
  async fetchGeminiExplanation(optics, apiKey) {
    const prompt = `நீங்கள் தமிழ்நாடு 10-ஆம் வகுப்பு அறிவியல் ஆசிரியராக (Tamil Nadu 10th-grade Physics Teacher) மாணவருக்கு விளக்குகிறீர்கள்:
தலைப்பு: ஒளியியல் - குவி லென்சு (Convex Lens) வழி ஒளிவிலகல் மற்றும் பிம்பம் உருவாதல்.
தற்போதைய அளவீடுகள்:
- பொருள் தொலைவு (u): ${optics.u} cm
- குவியத் தொலைவு (f): ${optics.f} cm
- பிம்பத் தொலைவு (v): ${optics.v} cm
- உருப்பெருக்கம் (m): ${optics.m}
- நிலை வகை: ${optics.stateTitleTa}
- பிம்பத்தின் தன்மை: ${optics.natureTa}
- பிம்பத்தின் அளவு: ${optics.sizeTa}
- நடைமுறைப் பயன்பாடு: ${optics.applicationTa}

மாணவருக்கு எளிமையாகப் புரியும்படி, 2 அல்லது 3 வாக்கியங்களில் இயற்கை தமிழில் சுருக்கமாக விளக்கவும் (பேச்சுத் தமிழில் இயற்பியல் கலைச்சொற்களுடன்).`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 250
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidateText || '';
  }

  /**
   * Speak Tamil text using Web Speech API
   */
  speakTamil(text) {
    if (!this.synth) {
      console.warn('Speech synthesis not supported in this browser.');
      return;
    }

    this.stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.tamilVoice) {
      utterance.voice = this.tamilVoice;
      utterance.lang = this.tamilVoice.lang || 'ta-IN';
    } else {
      utterance.lang = 'ta-IN';
    }

    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.currentUtterance = utterance;
      this.notify({ type: 'speech_started', text });
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.notify({ type: 'speech_ended' });
    };

    utterance.onerror = (e) => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.notify({ type: 'speech_error', error: e });
    };

    try {
      this.synth.speak(utterance);
    } catch (err) {
      console.error('Error invoking speechSynthesis.speak:', err);
      this.isSpeaking = false;
      this.notify({ type: 'speech_ended' });
    }
  }

  stopSpeaking() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {
        // Ignore
      }
    }
    if (this.isSpeaking) {
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.notify({ type: 'speech_ended' });
    }
  }

  toggleSpeech(text) {
    if (this.isSpeaking) {
      this.stopSpeaking();
    } else if (text) {
      this.speakTamil(text);
    }
  }
}

export const aiExplainer = new AIExplainer();
