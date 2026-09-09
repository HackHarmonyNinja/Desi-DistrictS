document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signupForm');
  const loginForm = document.getElementById('loginForm');
  const sellerExtras = document.getElementById('sellerExtras');
  const signupBtn = document.getElementById('signupBtn');
  const loginBtn = document.getElementById('loginBtn');
  const radios = document.getElementsByName('role');

  // Toggle forms
  signupBtn.addEventListener('click', () => {
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    signupBtn.classList.add('active');
    loginBtn.classList.remove('active');
  });

  loginBtn.addEventListener('click', () => {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    loginBtn.classList.add('active');
    signupBtn.classList.remove('active');
  });

  // Helper function to update seller field visibility & required status
  const updateSellerFields = (roleValue) => {
    if (!sellerExtras) return;
    if (roleValue === 'Seller') {
      sellerExtras.style.display = 'block';
      sellerExtras.querySelectorAll('input, textarea').forEach(f => f.setAttribute('required', ''));
    } else {
      sellerExtras.style.display = 'none';
      sellerExtras.querySelectorAll('input, textarea').forEach(f => f.removeAttribute('required'));
    }
  };

  // Helper to toggle glass card selected styling
  const updateRoleCardsUI = (selectedRole) => {
    const buyerCard = document.getElementById('cardBuyer');
    const sellerCard = document.getElementById('cardSeller');

    if (buyerCard && sellerCard) {
      buyerCard.classList.toggle('active', selectedRole === 'Buyer');
      sellerCard.classList.toggle('active', selectedRole === 'Seller');
    }
  };

  // Show/hide Seller fields & update card active state dynamically
  Array.from(radios).forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        updateSellerFields(radio.value);
        updateRoleCardsUI(radio.value);
      }
    });
  });

  // Safely initialize card active UI on page load
  const selectedRoleElement = document.querySelector('input[name="role"]:checked');
  if (selectedRoleElement) {
    updateSellerFields(selectedRoleElement.value);
    updateRoleCardsUI(selectedRoleElement.value);
  }

  // Sign up submit handler
  signupForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value.trim();
    
    const roleElement = document.querySelector('input[name="role"]:checked');
    const role = roleElement ? roleElement.value : 'Buyer';

    const bizDescInput = document.getElementById('bizDesc');
    const shopAddrInput = document.getElementById('shopAddr');
    const bizDesc = bizDescInput ? bizDescInput.value.trim() : '';
    const shopAddr = shopAddrInput ? shopAddrInput.value.trim() : '';

    if (!name || !email || !phone || !password || (role === 'Seller' && (!bizDesc || !shopAddr))) {
      alert('Please fill all required fields');
      return;
    }

    const users = JSON.parse(localStorage.getItem('dd_users') || '[]');
    if (users.find(u => u.email === email)) {
      alert('An account with this email already exists'); 
      return; 
    }

    const user = { id: Date.now(), name, email, phone, password, role };
    if (role === 'Seller') { 
      user.bizDesc = bizDesc; 
      user.shopAddr = shopAddr; 
    }

    users.push(user);
    localStorage.setItem('dd_users', JSON.stringify(users));
    alert('Account created! Redirecting to Home...');
    window.location.href = 'index.html';
  });

  // Main Form Submission Handler
  const authForm = document.querySelector('form') || document.getElementById('authForm');
  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Read standard required fields
      const email = document.querySelector('input[type="email"]')?.value.trim();
      const password = document.querySelector('input[type="password"]')?.value.trim();
      const selectedRole = document.querySelector('input[name="role"]:checked')?.value;

      // Validate basic credentials first
      if (!email || !password) {
        alert("Please fill in all required fields (Email and Password).");
        return;
      }

      // If Seller is selected, open the onboarding modal instead of blocking
      if (selectedRole === 'Seller') {
        openSellerModal();
      } else {
        // Buyer flow action
        alert("Account created successfully as Buyer!");
      }
    });
  }
});

// Toggle 'Other' Artform Input
function toggleOtherArtform(val) {
  const otherGroup = document.getElementById('otherArtformGroup');
  if (otherGroup) {
    otherGroup.style.display = (val === 'Other') ? 'block' : 'none';
  }
}

// Open / Close Modal Handlers
function openSellerModal() {
  const modal = document.getElementById('sellerModal');
  if (modal) modal.classList.add('open');
}

function closeSellerModal() {
  const modal = document.getElementById('sellerModal');
  if (modal) modal.classList.remove('open');
}

// Dialog Box Handlers
function showSavedDialog() {
  const dialog = document.getElementById('savedDialogOverlay');
  if (dialog) dialog.style.display = 'flex';
}

function closeSavedDialog() {
  const dialog = document.getElementById('savedDialogOverlay');
  if (dialog) dialog.style.display = 'none';
  closeSellerModal();
}

// Mock Voice Input Helper
function toggleVoiceAssist(fieldKey) {
  const statusElem = document.getElementById(fieldKey + 'Status');
  if (!statusElem) return;

  statusElem.innerText = "Listening... Speak now";
  
  // Simulated Speech Recognition standard delay
  setTimeout(() => {
    statusElem.innerText = "Voice captured successfully.";
    setTimeout(() => { statusElem.innerText = ""; }, 3000);
  }, 2500);
}

// Intercept Onboarding Form Submission
const sellerForm = document.getElementById('sellerOnboardingForm');
if (sellerForm) {
  sellerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Save data logic goes here
    
    showSavedDialog();
  });
}
// Close saved dialog and route seller to their new homepage
function closeSavedDialog() {
  const dialog = document.getElementById('savedDialogOverlay');
  if (dialog) dialog.style.display = 'none';
  
  if (typeof closeSellerModal === 'function') {
    closeSellerModal();
  }
  
  // Redirect to the custom Seller Home Page
  window.location.href = 'seller-home.html';
}

// Redirect logic on primary auth form submission if role is Buyer vs Seller
document.addEventListener('DOMContentLoaded', () => {
  const authForm = document.querySelector('form') || document.getElementById('authForm');

  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const selectedRoleElement = document.querySelector('input[name="role"]:checked');
      const selectedRole = selectedRoleElement ? selectedRoleElement.value : 'Buyer';

      if (selectedRole === 'Seller') {
        openSellerModal();
      } else {
        // Buyer flow action
        window.location.href = 'index.html';
      }
    });
  }
});