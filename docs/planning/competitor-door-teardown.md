# Dual-audience entry inventory — planning input

Public-page research, September 17–18, 2026. Products: Psychology Today, Zocdoc, Recovery.com and Yelp. No accounts created, no forms submitted, no authenticated portals entered. This is discovery, not a defect audit or proposed implementation.

Evidence labels: **Browser** = directly rendered interactive page; **Public page** = retrieved official page content/links; **Documentation** = official explanatory material. Prominence describes page hierarchy, not a measured mobile/desktop usability study. Authenticated-shell capabilities are documented, not directly tested. An unobserved switch is not proof that no switch exists.

## 1. Psychology Today

| Dimension | Inventory and evidence |
|---|---|
| Consumer door | Therapist directory and location-based discovery are the primary public experience; browsing does not require signup. Professional entry sits below that content in the members/footer area. Exact links include **“Log In”**, **“Sign Up”**, and **“Sign Up and Get Listed”**. [Directory — public page](https://www.psychologytoday.com/us/therapists) |
| Professional door | Dedicated acquisition site, then dedicated member host. **“Join Now”** and **“Login”** are the entry actions. Chain: `join.psychologytoday.com/us/signup` → `member.psychologytoday.com/us/registration`; existing users → member login. [Join page — public page](https://join.psychologytoday.com/us/signup) |
| Registration asks | Browser displayed username, email and password fields. Exact role choices: **“For Professionals”** and **“For Treatment Centers”**. Progress labels: **“Get Started” → “Name & Location” → “Credentials” → “Billing Info”**. Only first-stage fields were viewed; no values entered and no account created. The later-stage labels establish the sequence, not the precise later questions. [Registration — Browser](https://member.psychologytoday.com/us/registration) |
| After-login shell | Public membership marketing describes profile management, response/view analytics and teletherapy tools. These are professional operations. Consumer search stays in the public directory. Exact authenticated navigation and any consumer account shell were not observed. [Membership description](https://join.psychologytoday.com/us/signup) |
| Wrong-door recovery | Registration exposes a logo link back to the public Psychology Today site (accessible container identifies its directory destination), plus member login. The registration role choice is between professional types, not patient versus professional. No universal in-account patient/provider switch observed. [Registration](https://member.psychologytoday.com/us/registration). Public support also separates professional and client assistance. [Customer service](https://www.psychologytoday.com/us/docs/customer-service) |

**Observed pattern:** public help-seeker discovery and paid professional membership have different sites and setup sequences. The professional flow signals credentials and billing before an account is submitted.

## 2. Zocdoc

| Dimension | Inventory and evidence |
|---|---|
| Consumer/provider doors | Homepage header includes **“List your practice on Zocdoc”**, **“Log in”**, **“Sign up”**. Provider navigation also uses **“For providers”** and **“Grow your practice”**. Patient doctor/location/insurance discovery remains the main page purpose. [Homepage — public page](https://www.zocdoc.com/) |
| Provider route | `/business/` provides its own login/signup and practice-acquisition content. **“Get started”** accompanies a work-email entry. Observed linked destinations: login → `https://www.zocdoc.com/signin?provider=1`; signup → `https://www.zocdoc.com/grow/sign-up?utm_medium=organicpro&utm_source=website`. Provider intent is explicit in the destination. [Business page](https://www.zocdoc.com/business/) |
| Provider signup asks | First page asks personal name, practice name and size, role, phone, login email, postal code, and whether the applicant previously used Zocdoc as a provider. Exact role prompt: **“What’s your role at the practice?”** Choices: **“Provider or practice owner”**, **“Office manager”**, **“Receptionist”**, **“Other”**. Existing-account escape: **“Log in”**. No input submitted; practice-size options and subsequent steps not inspected. [Provider signup — public page](https://www.zocdoc.com/grow/sign-up) |
| Provider login | Email-first screen: **“To log in, enter your email address”**, **“Continue”**. The public result does not reveal the later challenge or post-login route. [Provider login](https://www.zocdoc.com/signin?provider=1) |
| Patient signup asks | Official patient help says an account is required to book, but signup can wait until booking. It asks legal name, date of birth and sex matching medical/insurance records; phone or email supports passwordless login. This is appointment identity, distinct from practice/employment questions. [Patient account documentation](https://www.zocdoc.com/patient-help/en/articles/8724679-how-do-i-create-a-zocdoc-account) |
| Shells | Provider marketing describes scheduling, patient acquisition, intake, communications and practice analytics. Patient documentation describes appointment booking and account access. These are distinct task sets; no logged-in menus were observed. [Provider product](https://www.zocdoc.com/business/), [patient login help](https://www.zocdoc.com/patient-help/en/articles/8839064-how-do-i-log-in-to-zocdoc) |
| Wrong-door recovery | Public homepage has the provider door beside consumer auth; provider registration offers existing-account login. No patient/provider account-switch interaction was observed inside auth. Browser homepage hit a device check; it was not bypassed. Official public pages supplied the form and route evidence above. |

**Observed pattern:** both doors are available in global navigation, while registration asks materially different questions for a patient and a practice team member.

## 3. Recovery.com

| Dimension | Inventory and evidence |
|---|---|
| Consumer/provider doors | Treatment/family discovery dominates the main site. Secondary navigation/contact areas expose **“Claim Your Profile”**, **“Claim Your Profile Today”**, **“For Providers”**, and **“For Treatment Seekers”**. Provider content lives on `providers.recovery.com`. [Main site — public page](https://recovery.com/) |
| Provider entry | Provider site repeatedly offers **“Claim Your Free Profile”**, with separate verification and advertising paths. This starts with a facility's public profile rather than a consumer recovery account. [Provider site](https://providers.recovery.com/) |
| Claim intake | Claim page heading **“Claim My Profile”**, CTA **“Claim Your Profile”**. Link leads to `https://rehabpath.typeform.com/to/EarSz9CA` (campaign parameters may be appended). Browser loaded the form title but only its loading/progress surface was available at observation; **claim questionnaire fields and role-choice strings were not reachable**. No answers entered. [Claim page](https://providers.recovery.com/claim-your-profile), [linked intake](https://rehabpath.typeform.com/to/EarSz9CA) |
| What setup establishes | Official claim documentation describes staff contact and review of the center's identity, admissions contact, cost, stay duration, founding date and occupancy. These are verification topics, **not a claim that each appeared as a signup field**. Higher verification includes licensing, accreditation and facility review. [Claim/verification documentation](https://providers.recovery.com/claimed-verified-profiles) |
| Further provider onboarding | Public verified-product instructions describe supplying center contact details, certification status, plan/payment, research follow-up and publication after approval. This is a separate paid-verification path, not evidence of the free claim form's exact sequence. [Provider product](https://providers.recovery.com/) |
| Shells | Public provider materials describe profile maintenance, admissions messages and performance reporting; claim page also permits edits through its support email. A current authenticated dashboard was not observed. Help-seekers have public search/profile/contact surfaces; no consumer account requirement was encountered in those pages. [Claim page](https://providers.recovery.com/claim-your-profile), [provider contact](https://providers.recovery.com/contact-us) |
| Wrong-door recovery | Main-site contact content explicitly distinguishes provider and treatment-seeker assistance and returns seekers to browsing. A logged-in role switch, shared identity system, or guaranteed self-service provider shell cannot be established from this pass. [Main site](https://recovery.com/) |

**Observed pattern:** a dedicated provider site centers its entry on claiming a facility, with staff/research involvement. The observable flow is not simply a differently labeled consumer signup.

## 4. Yelp

| Dimension | Inventory and evidence |
|---|---|
| Consumer/provider doors | Homepage header exposes **“Yelp for Business”**, **“Log In”**, **“Sign Up”**; footer adds **“Business Owner Login”** and **“Claim your Business Page”**. Business login goes to `biz.yelp.com/login`; consumer discovery remains on `www.yelp.com`. [Homepage — public page](https://www.yelp.com/) |
| Business signup asks | Official claiming guide describes finding the business, creating an account with business information and email, then verifying the claim. Current interactive business registration returned HTTP 403, so its exact input labels, role options and later steps are **not observed**. [Official claiming guide — documentation](https://business.yelp.com/resources/articles/ultimate-guide-to-claiming-your-yelp-page/) |
| Consumer signup | Official support distinguishes personal consumer signup from business-page claiming. Personal login supports email and Google/Apple. Do not infer that an existing personal identity automatically supplies business access. [Signup help](https://www.yelp-support.com/article/How-do-I-sign-up-for-Yelp?l=en_US), [login help](https://www.yelp-support.com/article/How-do-I-log-into-Yelp?l=en_US) |
| Shells | Consumer accounts serve personal participation; business claiming unlocks management of the listing and business information. Official business access documentation describes inviting additional people to manage the business page. No authenticated screen or current menu layout was inspected. [Personal account purpose](https://www.yelp-support.com/article/What-is-a-user-account?l=en_US), [business access](https://www.yelp-support.com/article/How-do-I-share-access-to-the-Yelp-page-for-my-business?l=en_GB) |
| Wrong-door recovery | Consumer signup/login documentation explicitly sends business owners to the business flow; global navigation and footer expose that escape route. No in-account personal/business toggle was observed. [Signup help](https://www.yelp-support.com/article/How-do-I-sign-up-for-Yelp?l=en_US), [support routing](https://www.yelp-support.com/article/How-do-I-use-Yelp-s-Support-Center?l=en_US) |

**Observed pattern:** business ownership is a listing-claim workflow with a named business portal. Consumer participation and business administration are separately explained, including in support material.

## Comparison for the spec discussion

| Question | Psychology Today | Zocdoc | Recovery.com | Yelp |
|---|---|---|---|---|
| Where does provider intent become explicit? | Professional join site / registration | Homepage business link, then provider URL and practice form | Provider site / facility-claim intake | Business door / listing claim |
| Public pre-account role selection observed? | Professional vs treatment center | Four practice-employment roles | Not observable in embedded intake | Not observable behind 403 |
| Consumer needs signup just to browse inspected pages? | No | No; booking requires account | No requirement encountered | No requirement encountered |
| Authenticated shell directly observed? | No | No | No | No |
| Wrong-door escape demonstrated publicly? | Directory link from registration | Global provider entry | Audience-specific contact/browse routes | Global business door and explicit support redirects |

The common observable distinction is **intent before credentials**: provider links lead to professional/practice/listing-specific contexts. That does not establish whether each service uses separate underlying identity stores. Nor does this pass establish seamless switching after login. Those remain unknowns rather than assumed best practices.

For SoberAnchor's spec, the relevant decisions are which public action carries provider intent, which setup questions belong to each journey, where a dual-role account lands, and how someone changes journeys without abandoning the task they began. These are planning questions, not recommendations to implement a particular competitor's architecture.
