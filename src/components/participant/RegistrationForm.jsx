import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { saveRegistrationAccess, upiApiRequest } from "../../firebase/upiApi";

const INDIVIDUAL_DRAFT_KEY = "yoga_individual_registration_draft";

const CURRENT_YEAR = new Date().getFullYear();
const DOB_YEARS = Array.from({ length: 80 }, (_, i) => String(CURRENT_YEAR - i));
const DOB_MONTHS = [
  { value: "01", label: "Jan (01)" },
  { value: "02", label: "Feb (02)" },
  { value: "03", label: "Mar (03)" },
  { value: "04", label: "Apr (04)" },
  { value: "05", label: "May (05)" },
  { value: "06", label: "Jun (06)" },
  { value: "07", label: "Jul (07)" },
  { value: "08", label: "Aug (08)" },
  { value: "09", label: "Sep (09)" },
  { value: "10", label: "Oct (10)" },
  { value: "11", label: "Nov (11)" },
  { value: "12", label: "Dec (12)" },
];
const DOB_DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));

const TEST_FORM_DATA = {
  name: "Aarav Kumar",
  dob: "2013-05-10",
  age: "12",
  gender: "male",
  class: "7th Standard",
  institution: "Green Valley School",
  instructor: "Ravi Sharma",
  instructorPhone: "9876543210",
  email: "aarav.kumar@test.com",
  event: "district",
  category: "forward",
  level: "district",
};

const emptyForm = {
  name: "",
  dob: "",
  age: "",
  gender: "",
  class: "",
  institution: "",
  instructor: "",
  instructorPhone: "",
  email: "",
  event: "",
  category: "",
  level: "",
};

const RegistrationForm = () => {
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(INDIVIDUAL_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
          return { ...emptyForm, ...parsed };
        }
      }
    } catch (_) {}
    if (process.env.NODE_ENV === "development") {
      return TEST_FORM_DATA;
    }
    return emptyForm;
  });

  // Automatically keep draft updated in localStorage so navigation back restores it
  useEffect(() => {
    try {
      localStorage.setItem(INDIVIDUAL_DRAFT_KEY, JSON.stringify(form));
    } catch (_) {}
  }, [form]);

  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const navigate = useNavigate();

  const fillTestData = () => {
    setForm(TEST_FORM_DATA);
    setErrors({});
  };

  const clearForm = () => {
    try {
      localStorage.removeItem(INDIVIDUAL_DRAFT_KEY);
    } catch (_) {}
    setForm(emptyForm);
    setErrors({});
    setCurrentStep(1);
  };

  const [dobYear, dobMonth, dobDay] = useMemo(() => {
    if (form.dob && /^\d{4}-\d{2}-\d{2}$/.test(form.dob)) {
      const parts = form.dob.split("-");
      return [parts[0], parts[1], parts[2]];
    }
    return ["", "", ""];
  }, [form.dob]);

  const handleDobPartChange = (part, val) => {
    let y = dobYear;
    let m = dobMonth;
    let d = dobDay;

    if (part === "year") y = val;
    if (part === "month") m = val;
    if (part === "day") d = val;

    if (y && m && d) {
      const fullDob = `${y}-${m}-${d}`;
      const today = new Date();
      const birthDate = new Date(`${y}-${m}-${d}`);
      if (!Number.isNaN(birthDate.getTime())) {
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        setForm((prev) => ({ ...prev, dob: fullDob, age: Math.max(0, age).toString() }));
        if (errors.dob) setErrors((prev) => ({ ...prev, dob: "" }));
        return;
      }
    }
    setForm((prev) => ({ ...prev, dob: y && m && d ? `${y}-${m}-${d}` : "" }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }

    if (name === "dob" && value) {
      const today = new Date();
      const birthDate = new Date(value);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setForm((prev) => ({ ...prev, age: age.toString() }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Full name is required";
    if (!form.dob) newErrors.dob = "Date of birth is required";
    if (!form.age) newErrors.age = "Age is required";
    if (!form.gender) newErrors.gender = "Gender is required";
    if (!form.class || !form.class.trim()) newErrors.class = "Class / standard is required";
    if (!form.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = "Please enter a valid email";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!form.institution.trim()) newErrors.institution = "Institution name is required";
    if (!form.instructor.trim()) newErrors.instructor = "Instructor name is required";
    if (!form.instructorPhone.trim()) newErrors.instructorPhone = "Phone number is required";
    else if (!/^\d{10}$/.test(form.instructorPhone.replace(/\D/g, ""))) {
      newErrors.instructorPhone = "Phone must be exactly 10 digits";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    if (!form.event) newErrors.event = "Please select an event type";
    if (!form.category) newErrors.category = "Please select a category";
    if (!form.level) newErrors.level = "Please select a competition level";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }
    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }
    if (!validateStep3()) {
      setCurrentStep(3);
      return;
    }

    setIsSubmitting(true);
    setSubmissionError("");

    try {
      const registration = await upiApiRequest("/api/registrations", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          dob: form.dob,
          age: Number(form.age),
          gender: form.gender,
          class: form.class,
          institution: form.institution,
          instructor: form.instructor,
          instructorPhone: form.instructorPhone,
          email: form.email,
          event: form.event,
          category: form.category,
          level: form.level,
        }),
      });
      saveRegistrationAccess(registration.paymentGroupId, registration.accessToken);
      try {
        sessionStorage.setItem("payment_entry_type_" + registration.paymentGroupId, "individual");
      } catch (_) {}
      navigate(`/upi-payment/${registration.paymentGroupId}`, { state: { entryType: "individual" } });
    } catch (error) {
      console.error("Registration submission failed:", error);
      setSubmissionError(error.message || "Could not save participant details.");
      setIsSubmitting(false);
    }
  };

  const inputClass = (fieldName) =>
    `w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none ${
      errors[fieldName]
        ? "border-red-400 focus:border-red-500 bg-red-50"
        : "border-gray-200 focus:border-purple-500 focus:bg-white"
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-orange-500 rounded-full mb-4 shadow-lg">
            <span className="text-4xl">🧘</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-3">
            <span className="bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
              Individual Registration
            </span>
          </h2>
          <p className="text-gray-600 text-lg">
            Join the Ekadhma Yoga Competition 2025
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 space-y-6 border border-purple-100">
          {submissionError && (
            <p role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {submissionError}
            </p>
          )}

          {/* Stepper Progress Header */}
          <div className="border-b border-gray-100 pb-5">
            <div className="flex items-center justify-between max-w-lg mx-auto relative">
              {/* Connecting line */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 z-0" />
              <div
                className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-purple-600 to-orange-500 -translate-y-1/2 z-0 transition-all duration-300"
                style={{ width: currentStep === 1 ? "0%" : currentStep === 2 ? "50%" : "100%" }}
              />

              {/* Step 1 */}
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-md ${
                    currentStep >= 1
                      ? "bg-purple-600 text-white ring-4 ring-purple-100"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {currentStep > 1 ? "✓" : "1"}
                </div>
                <span className="text-xs font-semibold mt-1.5 text-gray-700">Personal</span>
              </button>

              {/* Step 2 */}
              <button
                type="button"
                onClick={() => {
                  if (validateStep1()) setCurrentStep(2);
                }}
                className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-md ${
                    currentStep >= 2
                      ? "bg-purple-600 text-white ring-4 ring-purple-100"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {currentStep > 2 ? "✓" : "2"}
                </div>
                <span className="text-xs font-semibold mt-1.5 text-gray-700">Institution</span>
              </button>

              {/* Step 3 */}
              <button
                type="button"
                onClick={() => {
                  if (validateStep1() && validateStep2()) setCurrentStep(3);
                }}
                className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-md ${
                    currentStep === 3
                      ? "bg-gradient-to-r from-purple-600 to-orange-500 text-white ring-4 ring-orange-100"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  3
                </div>
                <span className="text-xs font-semibold mt-1.5 text-gray-700">Event & Pay</span>
              </button>
            </div>
          </div>

          {process.env.NODE_ENV === "development" && (
            <div className="flex flex-wrap gap-2 justify-end text-xs">
              <button
                type="button"
                onClick={fillTestData}
                className="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 font-medium hover:bg-purple-200 transition-colors"
              >
                Load Test Data
              </button>
              <button
                type="button"
                onClick={clearForm}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
              >
                Clear Form
              </button>
            </div>
          )}

          {/* STEP 1: PERSONAL INFORMATION */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                <span>👤</span>
                <span>Personal Information</span>
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Aarav Kumar"
                    className={inputClass("name")}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-600 font-medium">⚠️ {errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="e.g. aarav@example.com"
                    className={inputClass("email")}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600 font-medium">⚠️ {errors.email}</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-semibold text-gray-700">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <span className="text-xs font-medium text-purple-600">Day / Month / Year</span>
                  </div>

                  {/* Smooth Day / Month / Year Dropdowns for easy scrolling */}
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={dobDay}
                      onChange={(e) => handleDobPartChange("day", e.target.value)}
                      className={`px-2 py-2.5 rounded-lg border-2 text-sm font-medium bg-white transition-all cursor-pointer ${
                        errors.dob ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-purple-500"
                      }`}
                    >
                      <option value="">Day</option>
                      {DOB_DAYS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    <select
                      value={dobMonth}
                      onChange={(e) => handleDobPartChange("month", e.target.value)}
                      className={`px-2 py-2.5 rounded-lg border-2 text-sm font-medium bg-white transition-all cursor-pointer ${
                        errors.dob ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-purple-500"
                      }`}
                    >
                      <option value="">Month</option>
                      {DOB_MONTHS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>

                    <select
                      value={dobYear}
                      onChange={(e) => handleDobPartChange("year", e.target.value)}
                      className={`px-2 py-2.5 rounded-lg border-2 text-sm font-medium bg-white transition-all cursor-pointer ${
                        errors.dob ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-purple-500"
                      }`}
                    >
                      <option value="">Year</option>
                      {DOB_YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* Smooth calendar picker with max & min bounds */}
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>Or pick date from calendar:</span>
                    <input
                      type="date"
                      name="dob"
                      value={/^\d{4}-\d{2}-\d{2}$/.test(form.dob) ? form.dob : ""}
                      max={new Date().toISOString().split("T")[0]}
                      min="1940-01-01"
                      onChange={handleChange}
                      className="px-2 py-1 rounded border border-gray-300 text-gray-700 bg-gray-50 hover:bg-white focus:border-purple-500 outline-none cursor-pointer text-xs"
                    />
                  </div>

                  {errors.dob && (
                    <p className="mt-1 text-xs text-red-600 font-medium">⚠️ {errors.dob}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Calculated Age <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={form.age}
                    onChange={handleChange}
                    placeholder="Auto-calculated from DOB"
                    className={inputClass("age")}
                    readOnly
                  />
                  {errors.age && (
                    <p className="mt-1 text-xs text-red-600 font-medium">⚠️ {errors.age}</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className={inputClass("gender")}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.gender && (
                    <p className="mt-1 text-xs text-red-600 font-medium">⚠️ {errors.gender}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Class / Grade <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="class"
                    value={form.class}
                    onChange={handleChange}
                    placeholder="e.g. 7th Standard, Class 8"
                    className={inputClass("class")}
                  />
                  {errors.class && (
                    <p className="mt-1 text-xs text-red-600 font-medium">⚠️ {errors.class}</p>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg transition-all"
                >
                  <span>Next: Institution Details</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: INSTITUTION & INSTRUCTOR */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                <span>🏫</span>
                <span>Institution & Instructor Details</span>
              </h3>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  School / College / Institution Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="institution"
                  value={form.institution}
                  onChange={handleChange}
                  placeholder="e.g. Green Valley Academy"
                  className={inputClass("institution")}
                />
                {errors.institution && (
                  <p className="mt-1 text-xs text-red-600 font-medium">⚠️ {errors.institution}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Yoga Instructor / Master Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="instructor"
                    value={form.instructor}
                    onChange={handleChange}
                    placeholder="e.g. Ravi Sharma"
                    className={inputClass("instructor")}
                  />
                  {errors.instructor && (
                    <p className="mt-1 text-xs text-red-600 font-medium">⚠️ {errors.instructor}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Instructor Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="instructorPhone"
                    maxLength={10}
                    value={form.instructorPhone}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    className={inputClass("instructorPhone")}
                  />
                  {errors.instructorPhone && (
                    <p className="mt-1 text-xs text-red-600 font-medium">⚠️ {errors.instructorPhone}</p>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-5 py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg transition-all"
                >
                  <span>Next: Competition Details</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: COMPETITION DETAILS & REVIEW */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                <span>🏆</span>
                <span>Competition Category & Confirmation</span>
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Event Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="event"
                    value={form.event}
                    onChange={handleChange}
                    className={inputClass("event")}
                  >
                    <option value="">Select Event</option>
                    <option value="district">🏘️ District Level</option>
                    <option value="state">🗺️ State Level</option>
                    <option value="national">🌏 National Level</option>
                  </select>
                  {errors.event && (
                    <p className="mt-1 text-xs text-red-600 font-medium">⚠️ {errors.event}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="level"
                    value={form.level}
                    onChange={handleChange}
                    className={inputClass("level")}
                  >
                    <option value="">Select Level</option>
                    <option value="district">District</option>
                    <option value="state">State</option>
                    <option value="south-india">South India</option>
                    <option value="national">National</option>
                  </select>
                  {errors.level && (
                    <p className="mt-1 text-xs text-red-600 font-medium">⚠️ {errors.level}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Asana Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className={inputClass("category")}
                >
                  <option value="">Select Category</option>
                  <option value="forward">⬆️ Forward Bending</option>
                  <option value="backward">⬇️ Backward Bending</option>
                  <option value="twist">🔄 Twist</option>
                  <option value="balance">⚖️ Balance</option>
                  <option value="standing">🧍 Standing</option>
                </select>
                {errors.category && (
                  <p className="mt-1 text-xs text-red-600 font-medium">⚠️ {errors.category}</p>
                )}
              </div>

              {/* Order Summary Pill */}
              <div className="bg-gradient-to-r from-purple-50 to-orange-50 border border-purple-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
                <div>
                  <span className="text-xs uppercase tracking-wider text-purple-700 font-bold block">
                    Registration Fee
                  </span>
                  <span className="text-gray-800 text-sm font-medium">
                    Participant: <strong>{form.name || "Participant"}</strong> ({form.age ? `${form.age} yrs` : "Age"})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-purple-700">₹2.00</span>
                  <span className="text-xs text-gray-500 block">UPI / QR Payment</span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  ← Back
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 py-4 px-6 rounded-xl font-bold text-lg text-white bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Proceed to Payment</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 pt-2">
            By proceeding, you confirm all details are accurate for Ekadhma Yoga Competition 2025.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;