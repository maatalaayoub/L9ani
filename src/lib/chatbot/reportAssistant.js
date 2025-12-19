// =====================================================
// L9ani Chatbot - Report Creation Assistant
// =====================================================
// This module guides users through creating complete reports
// using a conversational flow
// =====================================================

import { detectLanguage } from './core';

// Report type configurations with required/optional fields
const REPORT_CONFIGS = {
    person: {
        requiredFields: ['firstName', 'lastName', 'city', 'lastKnownLocation'],
        optionalFields: ['dateOfBirth', 'gender', 'healthStatus', 'healthDetails', 'photos', 'additionalInfo'],
        questions: {
            firstName: {
                en: "What is the person's first name?",
                ar: "ما هو الاسم الأول للشخص؟",
                darija: "شنو السمية الأولى ديالو/ديالها؟"
            },
            lastName: {
                en: "What is the person's last name?",
                ar: "ما هو اسم العائلة؟",
                darija: "شنو السمية العائلية؟"
            },
            dateOfBirth: {
                en: "What is their date of birth? (or approximate age)",
                ar: "ما هو تاريخ ميلادهم؟ (أو العمر التقريبي)",
                darija: "شحال فعمرو/عمرها؟ (ولا تاريخ الازدياد)"
            },
            gender: {
                en: "What is their gender?",
                ar: "ما هو الجنس؟",
                darija: "راجل ولا مرا؟"
            },
            city: {
                en: "In which city were they last seen?",
                ar: "في أي مدينة شوهدوا آخر مرة؟",
                darija: "فين تشافو آخر مرة؟ (شنو المدينة؟)"
            },
            lastKnownLocation: {
                en: "Where exactly were they last seen? (neighborhood, street, landmark)",
                ar: "أين شوهدوا بالضبط؟ (الحي، الشارع، معلم قريب)",
                darija: "فين بالضبط؟ (الحومة، الزنقة، شي بلاصة معروفة)"
            },
            healthStatus: {
                en: "Do they have any health conditions? (physical, mental, or none)",
                ar: "هل لديهم أي حالة صحية؟ (جسدية، نفسية، أو لا شيء)",
                darija: "واش عندو/ها شي مشكل صحي؟ (جسدي، نفسي، ولا والو)"
            },
            photos: {
                en: "Do you have a recent photo? This greatly helps identification. You can upload it on the form.",
                ar: "هل لديك صورة حديثة؟ هذا يساعد كثيراً في التعرف. يمكنك رفعها في النموذج.",
                darija: "عندك شي تصويرة ديالو/ها جديدة؟ هادي كتعاون بزاف. تقدر ترفعها فالفورم."
            },
            additionalInfo: {
                en: "Any additional details? (what they were wearing, distinguishing features, circumstances)",
                ar: "أي تفاصيل إضافية؟ (ماذا كانوا يرتدون، علامات مميزة، الظروف)",
                darija: "شي تفاصيل أخرى؟ (شنو كان لابس، شي حاجة مميزة، كيفاش ضاع)"
            }
        }
    },
    pet: {
        requiredFields: ['petName', 'petType', 'city', 'lastKnownLocation'],
        optionalFields: ['breed', 'color', 'size', 'photos', 'additionalInfo'],
        questions: {
            petName: {
                en: "What is your pet's name?",
                ar: "ما هو اسم حيوانك الأليف؟",
                darija: "شنو سميتو؟"
            },
            petType: {
                en: "What type of pet? (dog, cat, bird, etc.)",
                ar: "ما نوع الحيوان؟ (كلب، قط، طائر، إلخ)",
                darija: "شنو هو؟ (كلب، مش، طير، ...)"
            },
            breed: {
                en: "What breed? (if known)",
                ar: "ما السلالة؟ (إذا كانت معروفة)",
                darija: "شنو النوع ديالو؟ (إلا عرفتي)"
            },
            color: {
                en: "What color is your pet?",
                ar: "ما لون حيوانك؟",
                darija: "شنو اللون ديالو؟"
            },
            size: {
                en: "What size? (small, medium, large)",
                ar: "ما الحجم؟ (صغير، متوسط، كبير)",
                darija: "كبير ولا صغير ولا وسط؟"
            },
            city: {
                en: "In which city did you lose them?",
                ar: "في أي مدينة فقدتهم؟",
                darija: "فين ضاع؟ (شنو المدينة؟)"
            },
            lastKnownLocation: {
                en: "Where exactly did you last see them?",
                ar: "أين رأيتهم آخر مرة بالضبط؟",
                darija: "فين بالضبط شفتيه آخر مرة؟"
            },
            photos: {
                en: "Do you have a photo of your pet?",
                ar: "هل لديك صورة لحيوانك؟",
                darija: "عندك شي تصويرة ديالو؟"
            },
            additionalInfo: {
                en: "Any additional details? (collar, microchip, behavior)",
                ar: "أي تفاصيل إضافية؟ (طوق، شريحة، سلوك)",
                darija: "شي تفاصيل أخرى؟ (كولي، شيب، كيفاش كيدير)"
            }
        }
    },
    document: {
        requiredFields: ['documentType', 'city', 'lastKnownLocation'],
        optionalFields: ['documentNumber', 'issuingAuthority', 'ownerName', 'photos', 'additionalInfo'],
        questions: {
            documentType: {
                en: "What type of document? (ID card, passport, driver's license, etc.)",
                ar: "ما نوع الوثيقة؟ (بطاقة هوية، جواز سفر، رخصة قيادة، إلخ)",
                darija: "شنو نوع الورقة؟ (كارطة، باسبور، بيرمي، ...)"
            },
            documentNumber: {
                en: "Do you know the document number? (don't share full number for safety)",
                ar: "هل تعرف رقم الوثيقة؟ (لا تشارك الرقم الكامل للأمان)",
                darija: "عرفتي النمرو؟ (ما تعطيش النمرو كامل للأمان)"
            },
            ownerName: {
                en: "Whose name is on the document?",
                ar: "ما اسم صاحب الوثيقة؟",
                darija: "سمية مول الورقة؟"
            },
            city: {
                en: "In which city did you lose it?",
                ar: "في أي مدينة فقدتها؟",
                darija: "فين ضاعت؟ (شنو المدينة؟)"
            },
            lastKnownLocation: {
                en: "Where do you think you lost it?",
                ar: "أين تعتقد أنك فقدتها؟",
                darija: "فين كتظن ضاعت ليك؟"
            },
            photos: {
                en: "Do you have a photo of the document? (blur sensitive info)",
                ar: "هل لديك صورة للوثيقة؟ (اطمس المعلومات الحساسة)",
                darija: "عندك شي تصويرة ديالها؟ (غطي المعلومات الخاصة)"
            },
            additionalInfo: {
                en: "Any additional details about where or when you lost it?",
                ar: "أي تفاصيل إضافية عن مكان أو وقت الفقدان؟",
                darija: "شي تفاصيل أخرى على فين ولا فوقاش ضاعت؟"
            }
        }
    },
    electronics: {
        requiredFields: ['deviceType', 'brand', 'city', 'lastKnownLocation'],
        optionalFields: ['model', 'color', 'serialNumber', 'photos', 'additionalInfo'],
        questions: {
            deviceType: {
                en: "What type of device? (phone, laptop, tablet, etc.)",
                ar: "ما نوع الجهاز؟ (هاتف، حاسوب، لوحي، إلخ)",
                darija: "شنو نوع الجهاز؟ (تيليفون، بورطابل، طابليط، ...)"
            },
            brand: {
                en: "What brand is it?",
                ar: "ما هي الماركة؟",
                darija: "شنو الماركة؟"
            },
            model: {
                en: "What model?",
                ar: "ما الموديل؟",
                darija: "شنو الموديل؟"
            },
            color: {
                en: "What color?",
                ar: "ما اللون؟",
                darija: "شنو اللون؟"
            },
            serialNumber: {
                en: "Do you have the serial number or IMEI?",
                ar: "هل لديك الرقم التسلسلي أو IMEI؟",
                darija: "عندك النمرو ديال IMEI ولا serial؟"
            },
            city: {
                en: "In which city did you lose it?",
                ar: "في أي مدينة فقدته؟",
                darija: "فين ضاع؟ (شنو المدينة؟)"
            },
            lastKnownLocation: {
                en: "Where did you last have it?",
                ar: "أين كان معك آخر مرة؟",
                darija: "فين كان معاك آخر مرة؟"
            },
            photos: {
                en: "Do you have a photo of the device?",
                ar: "هل لديك صورة للجهاز؟",
                darija: "عندك شي تصويرة ديالو؟"
            },
            additionalInfo: {
                en: "Any additional details? (case, stickers, damage)",
                ar: "أي تفاصيل إضافية؟ (غطاء، ملصقات، أضرار)",
                darija: "شي تفاصيل أخرى؟ (الكوفر، شي ستيكرات، شي كسرة)"
            }
        }
    },
    vehicle: {
        requiredFields: ['vehicleType', 'brand', 'city', 'lastKnownLocation'],
        optionalFields: ['model', 'color', 'year', 'licensePlate', 'photos', 'additionalInfo'],
        questions: {
            vehicleType: {
                en: "What type of vehicle? (car, motorcycle, bicycle, etc.)",
                ar: "ما نوع المركبة؟ (سيارة، دراجة نارية، دراجة، إلخ)",
                darija: "شنو نوع المركبة؟ (طوموبيل، موطور، بيكالا، ...)"
            },
            brand: {
                en: "What brand/make?",
                ar: "ما هي الماركة؟",
                darija: "شنو الماركة؟"
            },
            model: {
                en: "What model?",
                ar: "ما الموديل؟",
                darija: "شنو الموديل؟"
            },
            color: {
                en: "What color?",
                ar: "ما اللون؟",
                darija: "شنو اللون؟"
            },
            year: {
                en: "What year?",
                ar: "ما السنة؟",
                darija: "شنو العام؟"
            },
            licensePlate: {
                en: "What is the license plate number?",
                ar: "ما رقم اللوحة؟",
                darija: "شنو الماتريكيل؟"
            },
            city: {
                en: "In which city was it lost/stolen?",
                ar: "في أي مدينة فُقدت/سُرقت؟",
                darija: "فين ضاعت/تسرقات؟ (شنو المدينة؟)"
            },
            lastKnownLocation: {
                en: "Where was it last parked/seen?",
                ar: "أين كانت آخر مرة؟",
                darija: "فين كانت آخر مرة؟"
            },
            photos: {
                en: "Do you have a photo of the vehicle?",
                ar: "هل لديك صورة للمركبة؟",
                darija: "عندك شي تصويرة ديالها؟"
            },
            additionalInfo: {
                en: "Any additional details? (damage, modifications, contents)",
                ar: "أي تفاصيل إضافية؟ (أضرار، تعديلات، محتويات)",
                darija: "شي تفاصيل أخرى؟ (شي كسرة، شي تعديل، شنو كان فيها)"
            }
        }
    },
    other: {
        requiredFields: ['itemName', 'city', 'lastKnownLocation'],
        optionalFields: ['itemDescription', 'photos', 'additionalInfo'],
        questions: {
            itemName: {
                en: "What is the item?",
                ar: "ما هو الغرض؟",
                darija: "شنو هي الحاجة؟"
            },
            itemDescription: {
                en: "Can you describe it in detail?",
                ar: "هل يمكنك وصفه بالتفصيل؟",
                darija: "وصفها لي مزيان؟"
            },
            city: {
                en: "In which city did you lose it?",
                ar: "في أي مدينة فقدته؟",
                darija: "فين ضاعت؟ (شنو المدينة؟)"
            },
            lastKnownLocation: {
                en: "Where did you last have it?",
                ar: "أين كان معك آخر مرة؟",
                darija: "فين كانت معاك آخر مرة؟"
            },
            photos: {
                en: "Do you have a photo of the item?",
                ar: "هل لديك صورة للغرض؟",
                darija: "عندك شي تصويرة ديالها؟"
            },
            additionalInfo: {
                en: "Any additional details?",
                ar: "أي تفاصيل إضافية؟",
                darija: "شي تفاصيل أخرى؟"
            }
        }
    }
};

/**
 * Initialize a new report creation session
 * @param {string} reportType - Type of report to create
 * @param {string} language - User's language
 * @returns {Object} - Initial context and first question
 */
export function initReportSession(reportType, language) {
    const config = REPORT_CONFIGS[reportType];
    
    if (!config) {
        return {
            error: true,
            message: {
                en: 'Invalid report type. Please choose: person, pet, document, electronics, vehicle, or other.',
                ar: 'نوع البلاغ غير صالح. الرجاء اختيار: شخص، حيوان، وثيقة، إلكترونيات، مركبة، أو آخر.',
                darija: 'نوع البلاغ ماشي صحيح. اختار: واحد، حيوان، ورقة، جهاز، طوموبيل، ولا حاجة خرا.'
            }[language]
        };
    }
    
    const allFields = [...config.requiredFields, ...config.optionalFields];
    const firstField = config.requiredFields[0];
    
    return {
        reportType,
        currentField: firstField,
        currentFieldIndex: 0,
        allFields,
        requiredFields: config.requiredFields,
        collectedData: {},
        isComplete: false,
        question: config.questions[firstField][language] || config.questions[firstField].en,
        progress: {
            current: 1,
            total: config.requiredFields.length,
            percentage: 0
        }
    };
}

/**
 * Process user's answer and get next question
 * @param {Object} context - Current session context
 * @param {string} answer - User's answer
 * @param {string} language - User's language
 * @returns {Object} - Updated context with next question or completion
 */
export function processReportAnswer(context, answer, language) {
    const { reportType, currentField, currentFieldIndex, collectedData, requiredFields, isInOptionalMode, optionalFieldIndex } = context;
    const config = REPORT_CONFIGS[reportType];
    
    // Handle user choosing to add optional details
    if (context.askedOptional && !isInOptionalMode) {
        // Check if user wants to continue with optional fields
        const wantsMore = answer.toLowerCase().includes('yes') || 
                          answer.toLowerCase().includes('add') ||
                          answer.toLowerCase().includes('more') ||
                          answer.includes('نعم') ||
                          answer.includes('إضافة') ||
                          answer.includes('زيد') ||
                          answer.includes('اه') ||
                          answer.includes('ايه');
        
        if (wantsMore) {
            // Start asking optional fields
            const optionalFields = config.optionalFields.filter(f => !collectedData[f] && f !== 'photos');
            if (optionalFields.length > 0) {
                const firstOptionalField = optionalFields[0];
                const question = config.questions[firstOptionalField];
                return {
                    ...context,
                    isInOptionalMode: true,
                    optionalFieldIndex: 0,
                    currentField: firstOptionalField,
                    question: question[language] || question.en,
                    quickReplies: [
                        { text: { en: 'Skip', ar: 'تخطي', darija: 'سكيبي' }[language], action: 'skip_field' }
                    ]
                };
            }
        }
        
        // User doesn't want to add more, complete
        return {
            ...context,
            isComplete: true,
            question: {
                en: `Perfect! I'll now take you to the report form with the information pre-filled. You can review, add photos, and submit.`,
                ar: `ممتاز! سأنقلك الآن إلى نموذج البلاغ مع المعلومات المعبأة مسبقاً. يمكنك المراجعة وإضافة الصور والإرسال.`,
                darija: `مزيان! دابا غادي ناخدك للفورم فيه المعلومات اللي عطيتيني. تقدر تراجع وتزيد التصاور وترسل.`
            }[language],
            action: {
                type: 'navigate_with_data',
                route: '/report-missing',
                params: {
                    type: reportType,
                    prefill: collectedData
                }
            }
        };
    }
    
    // Handle optional field mode
    if (isInOptionalMode) {
        const optionalFields = config.optionalFields.filter(f => f !== 'photos');
        const isSkip = answer.toLowerCase() === 'skip' || answer === 'سكيبي' || answer === 'تخطي';
        
        // Store the answer (unless skipped)
        const updatedData = isSkip ? collectedData : {
            ...collectedData,
            [currentField]: answer
        };
        
        // Find next optional field
        const currentOptIndex = optionalFields.indexOf(currentField);
        const nextOptionalField = optionalFields[currentOptIndex + 1];
        
        if (nextOptionalField && config.questions[nextOptionalField]) {
            const question = config.questions[nextOptionalField];
            return {
                ...context,
                collectedData: updatedData,
                currentField: nextOptionalField,
                optionalFieldIndex: currentOptIndex + 1,
                question: question[language] || question.en,
                quickReplies: [
                    { text: { en: 'Skip', ar: 'تخطي', darija: 'سكيبي' }[language], action: 'skip_field' },
                    { text: { en: 'Done, go to form', ar: 'انتهيت، للنموذج', darija: 'سالينا، سير للفورم' }[language], action: 'complete_report' }
                ]
            };
        }
        
        // No more optional fields, complete
        return {
            ...context,
            collectedData: updatedData,
            isComplete: true,
            question: {
                en: `Excellent! I have all the details. Let me take you to the form to review and submit.`,
                ar: `ممتاز! لدي كل التفاصيل. دعني أنقلك للنموذج للمراجعة والإرسال.`,
                darija: `هاينا! عندي كلشي. دابا ناخدك للفورم تراجع وترسل.`
            }[language],
            action: {
                type: 'navigate_with_data',
                route: '/report-missing',
                params: {
                    type: reportType,
                    prefill: updatedData
                }
            }
        };
    }
    
    // Store the answer for required fields
    const updatedData = {
        ...collectedData,
        [currentField]: answer
    };
    
    // Find next required field that's not yet filled
    const nextRequiredIndex = requiredFields.findIndex((field, idx) => 
        idx > currentFieldIndex && !updatedData[field]
    );
    
    // Check if all required fields are filled
    const allRequiredFilled = requiredFields.every(field => updatedData[field]);
    
    if (allRequiredFilled) {
        // Ask if they want to add optional info
        const optionalFields = config.optionalFields.filter(f => !updatedData[f] && f !== 'photos');
        
        if (optionalFields.length > 0 && !context.askedOptional) {
            return {
                ...context,
                collectedData: updatedData,
                askedOptional: true,
                currentField: null,
                question: {
                    en: `Great! I have the essential information. Would you like to add more details to increase the chances of finding ${reportType === 'person' ? 'them' : 'it'}?\n\nYou can also complete this on the form page.`,
                    ar: `ممتاز! لدي المعلومات الأساسية. هل تريد إضافة المزيد من التفاصيل لزيادة فرص العثور؟\n\nيمكنك أيضاً إكمال هذا في صفحة النموذج.`,
                    darija: `مزيان! عندي المعلومات الأساسية. بغيتي تزيد شي تفاصيل باش تزيد فرصة اللقيان؟\n\nتقدر تكمل هادشي فالفورم.`
                }[language],
                quickReplies: [
                    { text: { en: 'Add more details', ar: 'إضافة تفاصيل', darija: 'زيد تفاصيل' }[language], action: 'continue_optional' },
                    { text: { en: 'Go to form', ar: 'الذهاب للنموذج', darija: 'سير للفورم' }[language], action: 'complete_report' }
                ],
                progress: {
                    current: requiredFields.length,
                    total: requiredFields.length,
                    percentage: 100
                }
            };
        }
        
        // Complete
        return {
            ...context,
            collectedData: updatedData,
            isComplete: true,
            question: {
                en: `Perfect! I'll now take you to the report form with the information pre-filled. You can review, add photos, and submit.`,
                ar: `ممتاز! سأنقلك الآن إلى نموذج البلاغ مع المعلومات المعبأة مسبقاً. يمكنك المراجعة وإضافة الصور والإرسال.`,
                darija: `مزيان! دابا غادي ناخدك للفورم فيه المعلومات اللي عطيتيني. تقدر تراجع وتزيد التصاور وترسل.`
            }[language],
            action: {
                type: 'navigate_with_data',
                route: '/report-missing',
                params: {
                    type: reportType,
                    prefill: updatedData
                }
            },
            progress: {
                current: requiredFields.length,
                total: requiredFields.length,
                percentage: 100
            }
        };
    }
    
    // Get next question
    const nextField = requiredFields[nextRequiredIndex !== -1 ? nextRequiredIndex : currentFieldIndex + 1];
    
    if (!nextField) {
        // Shouldn't happen, but safety fallback
        return {
            ...context,
            collectedData: updatedData,
            isComplete: true
        };
    }
    
    const nextQuestion = config.questions[nextField];
    const newIndex = requiredFields.indexOf(nextField);
    
    return {
        ...context,
        collectedData: updatedData,
        currentField: nextField,
        currentFieldIndex: newIndex,
        question: nextQuestion[language] || nextQuestion.en,
        progress: {
            current: newIndex + 1,
            total: requiredFields.length,
            percentage: Math.round((newIndex / requiredFields.length) * 100)
        }
    };
}

/**
 * Generate a summary of collected report data
 * @param {Object} collectedData - Data collected from user
 * @param {string} reportType - Type of report
 * @param {string} language - User's language
 * @returns {string} - Formatted summary
 */
export function generateReportSummary(collectedData, reportType, language) {
    const labels = {
        firstName: { en: 'First Name', ar: 'الاسم الأول', darija: 'السمية' },
        lastName: { en: 'Last Name', ar: 'اسم العائلة', darija: 'النسب' },
        petName: { en: 'Pet Name', ar: 'اسم الحيوان', darija: 'السمية' },
        petType: { en: 'Pet Type', ar: 'نوع الحيوان', darija: 'النوع' },
        documentType: { en: 'Document Type', ar: 'نوع الوثيقة', darija: 'نوع الورقة' },
        deviceType: { en: 'Device Type', ar: 'نوع الجهاز', darija: 'نوع الجهاز' },
        vehicleType: { en: 'Vehicle Type', ar: 'نوع المركبة', darija: 'النوع' },
        itemName: { en: 'Item', ar: 'الغرض', darija: 'الحاجة' },
        brand: { en: 'Brand', ar: 'الماركة', darija: 'الماركة' },
        model: { en: 'Model', ar: 'الموديل', darija: 'الموديل' },
        color: { en: 'Color', ar: 'اللون', darija: 'اللون' },
        city: { en: 'City', ar: 'المدينة', darija: 'المدينة' },
        lastKnownLocation: { en: 'Location', ar: 'الموقع', darija: 'البلاصة' }
    };
    
    const header = {
        en: '📋 **Report Summary:**\n',
        ar: '📋 **ملخص البلاغ:**\n',
        darija: '📋 **ملخص البلاغ:**\n'
    }[language];
    
    let summary = header;
    
    for (const [key, value] of Object.entries(collectedData)) {
        if (value && labels[key]) {
            const label = labels[key][language] || labels[key].en;
            summary += `• ${label}: ${value}\n`;
        }
    }
    
    return summary;
}

/**
 * Get progress message for report creation
 */
export function getProgressMessage(progress, language) {
    const { current, total, percentage } = progress;
    
    const progressBar = '▓'.repeat(Math.round(percentage / 10)) + '░'.repeat(10 - Math.round(percentage / 10));
    
    return {
        en: `Step ${current}/${total} [${progressBar}] ${percentage}%`,
        ar: `الخطوة ${current}/${total} [${progressBar}] ${percentage}%`,
        darija: `الخطوة ${current}/${total} [${progressBar}] ${percentage}%`
    }[language];
}
