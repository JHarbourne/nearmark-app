<!-- OwnerContact – the private owner-contact + approval box for one story's
     participant (the resident / artist behind a DRAFT story). Extracted from
     StoryFields so it can be hosted in two places:
       • inside StoryFields (the standalone Story editor), and
       • directly in the Location editor's right column, under the map (so the
         single-story page doesn't bury it at the foot of the content form).
     It edits the reactive `contact` object it's given in place (email + mobile);
     the approval fields (name, keep-details, note, address-edited flag) are
     read-only display of what the artist supplied via the /approve/<token> RPC. -->
<template>
  <div style="padding:14px 16px; border:1px solid var(--line); border-radius:12px;">
    <span class="field-label" style="margin-top:0;">Owner contact <span class="hint">private – never published</span></span>
    <p class="muted" style="font-size:12.5px; margin:2px 0 12px;">The resident or artist behind this story. Kept on record for organising and consent – never shown in the app.</p>
    <div class="field-row">
      <div>
        <label for="oc-email">Email</label>
        <input id="oc-email" type="email" v-model="contact.contact_email" placeholder="name@example.com" />
      </div>
      <div>
        <label for="oc-mobile">Mobile</label>
        <input id="oc-mobile" type="tel" v-model="contact.contact_mobile" placeholder="07…" />
      </div>
    </div>

    <!-- Approval status + the artist's private approval link (Phase 2). Shown once
         a participant row exists (i.e. the story has been saved with a contact) —
         the token drives the /approve/<token> page. -->
    <div v-if="contact.token" style="margin-top:16px; padding-top:14px; border-top:1px solid var(--line);">
      <span class="field-label" style="margin-top:0;">Approval
        <span v-if="isApproved" class="badge" style="background:var(--green,#2FBF71); color:#fff; margin-left:8px;">Approved</span>
        <span v-else class="badge" style="background:var(--amber,#E0A800); color:#fff; margin-left:8px;">Pending</span>
      </span>
      <p v-if="isApproved" class="muted" style="font-size:12.5px; margin:2px 0 0;">Approved by the artist{{ approvedDate ? ' · ' + approvedDate : '' }}.</p>
      <p v-else class="muted" style="font-size:12.5px; margin:2px 0 0;">Waiting for the artist to approve. Send them the link below.</p>

      <!-- what the artist supplied on the approval page (read-only) -->
      <p v-if="contact.name" style="font-size:12.5px; margin:8px 0 0;"><strong>Approved by:</strong> {{ contact.name }}</p>
      <p v-if="isApproved" style="font-size:12.5px; margin:6px 0 0;"><strong>Keep details for next time:</strong> {{ contact.keep_details ? 'Yes' : 'No' }}</p>

      <!-- the artist edited their (solo) address → the pin needs re-checking -->
      <p v-if="contact.address_changed" role="alert" style="font-size:12.5px; margin:8px 0 0; padding:8px 10px; background:var(--amber-soft,#fff6df); border:1px solid var(--amber,#E0A800); border-radius:8px; color:var(--ink-soft);">
        <strong>Address edited by artist — re-pin.</strong> They changed their address on the approval page; the map pin wasn't moved. Check the address below and re-drop the pin.
      </p>

      <p v-if="contact.approval_note" style="font-size:12.5px; margin:8px 0 0; padding:8px 10px; background:var(--raised); border:1px solid var(--line); border-radius:8px; color:var(--ink-soft);">
        <strong>Their note:</strong> {{ contact.approval_note }}
      </p>
      <label for="oc-approve-link" style="margin-top:12px;">Approval link <span class="hint">private – send only to this artist</span></label>
      <div class="media-row">
        <div class="media-input solo">
          <input id="oc-approve-link" type="text" :value="approveLink" readonly @focus="$event.target.select()" />
        </div>
        <button type="button" class="btn btn-ghost btn-sm" @click="copyLink">{{ copied ? 'Copied ✓' : 'Copy' }}</button>
        <!-- one-tap send, pre-filled with a friendly message + the link. Only when
             a mobile is on record, so there's a number to text / WhatsApp. -->
        <a v-if="contact.contact_mobile" :href="smsHref" class="btn btn-ghost btn-sm send-btn">Text</a>
        <a v-if="contact.contact_mobile" :href="waHref" target="_blank" rel="noopener" class="btn btn-ghost btn-sm send-btn">WhatsApp</a>
      </div>
    </div>

    <!-- No token yet (no participant row saved) → tell the organiser how to get one,
         instead of the whole approval block silently vanishing. -->
    <p v-else class="muted" style="font-size:12.5px; margin:16px 0 0; padding-top:14px; border-top:1px solid var(--line);">
      Save a contact and the approval link will appear here.
    </p>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { config } from '../../config.js'

const props = defineProps({
  // the reactive participant/contact object owned by the parent editor. Carries
  // the editable contact_email/contact_mobile plus the read-only approval fields
  // (token, status, approved_at, approval_note, name, keep_details, address_changed).
  contact: { type: Object, required: true },
})

// reactive() on an already-reactive proxy returns the same proxy, so v-model edits
// flow to the parent while reading as a plain local (eslint no-mutating-props).
const contact = reactive(props.contact)

const isApproved = computed(() => contact.status === 'approved' || !!contact.approved_at)
const approvedDate = computed(() => (contact.approved_at ? new Date(contact.approved_at).toLocaleDateString() : ''))
const appOrigin = (config.publicUrl || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '')
const approveLink = computed(() => (contact.token ? `${appOrigin}/approve/${contact.token}` : ''))

// A friendly, pre-filled message for the one-tap Text / WhatsApp buttons.
const sendMessage = computed(() => `Hi! Here’s your ${config.appName} listing to check over and approve when you get a moment: ${approveLink.value} – thank you!`)
// SMS: the `?&body=` form is the one that works on both iOS and Android.
const smsHref = computed(() => `sms:${contact.contact_mobile || ''}?&body=${encodeURIComponent(sendMessage.value)}`)
// WhatsApp: needs an international number. Assumes UK — strip spaces/punctuation
// and turn a leading 0 into 44. (Non-UK numbers would need their own code.)
const waHref = computed(() => {
  const intl = String(contact.contact_mobile || '').replace(/[^\d]/g, '').replace(/^0/, '44')
  return `https://wa.me/${intl}?text=${encodeURIComponent(sendMessage.value)}`
})

const copied = ref(false)
let copiedTimer
async function copyLink() {
  try {
    await navigator.clipboard.writeText(approveLink.value)
    copied.value = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copied.value = false }, 2500)
  } catch { window.prompt('Copy the approval link:', approveLink.value) }
}
</script>

<style scoped>
.media-input { position: relative; }
.media-input.solo > input { padding-right: 46px; }
.media-row { display: flex; align-items: center; gap: 8px; }
.media-row > .media-input { flex: 1; min-width: 0; }
.media-row > .btn { flex-shrink: 0; }
/* anchors styled as buttons (Text / WhatsApp): match the .btn look + centre content */
.send-btn { text-decoration: none; display: inline-flex; align-items: center; justify-content: center; }
</style>
