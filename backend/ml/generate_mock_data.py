import csv
import random
import os

def generate_mock_data(output_file="data/mock_dataset.csv", num_samples=2000):
    # Synonyms and templates for combinatorial generation
    greetings = ["", "", "Hi,", "Hello,", "Hey,", "Excuse me,", "Good morning,", "Good afternoon,"]
    polite_openers = ["", "", "I was wondering,", "Could you tell me,", "I'd like to know,", "Do you know", "Please tell me"]
    
    # Billing
    billing_questions = [
        "how much is", "what is the cost of", "do you have the price for", 
        "can you tell me the price of", "what are the fees for", "how much does it cost for",
        "is there a fee for", "can I get a quote for", "how much to pay for", "what's the rate for"
    ]
    procedures_billing = [
        "braces", "metal braces", "ceramic braces", "self ligating braces", "sapphire braces",
        "a root canal", "oral prophylaxis", "a regular cleaning", "wisdom tooth extraction",
        "panoramic xray", "periapical xray", "composite veneers", "clear retainers", 
        "hawley retainers", "a complete denture", "TMJ consultation with Doc Meg", 
        "teeth whitening with free OP", "a zirconia crown", "a basic extraction", "deep scale",
        "splints", "SVED", "sagittal appliance", "bite plane"
    ]
    billing_extras = [
        "Do you accept my health insurance?",
        "Can I pay in installments?",
        "What payment methods do you accept?",
        "I need a copy of my last receipt.",
        "Is there a discount for senior citizens?",
        "Do you take credit cards?",
        "Can I use my HMO card?",
        "Do you charge for follow up visits?"
    ]

    # Appointments
    appt_verbs = ["schedule", "book", "set up", "arrange", "cancel", "reschedule", "move", "delay"]
    appt_nouns = ["an appointment", "a checkup", "a consultation", "a visit", "a session", "my slot"]
    appt_times = ["tomorrow", "next week", "this coming Friday", "on the weekend", "later today", "for next month", "for Monday"]
    appt_extras = [
        "Are you open on weekends?",
        "Do you accept walk-in patients?",
        "What are your clinic hours?",
        "I need to see a dentist immediately, it's an emergency.",
        "How long does a typical appointment last?",
        "Please remind me of my next appointment date.",
        "I want to see the doctor right now.",
        "Are there any open slots today?"
    ]

    # Post Op Care
    post_op_issues = ["bleeding", "swelling", "hurting a lot", "aching", "throbbing", "sensitive", "sore", "painful"]
    post_op_areas = ["tooth", "gum", "extraction site", "jaw", "filling", "crown", "braces"]
    post_op_actions = [
        "When can I eat solid food?", "Can I drink coffee?", "Should I take painkillers?",
        "When can I brush my teeth?", "Is it okay to use mouthwash?", "What should I do if the pain gets worse?",
        "My temporary crown fell off, what now?", "How do I clean my new braces?",
        "The bleeding hasn't stopped, what should I do?", "Is it normal to have a fever after extraction?"
    ]

    # General Inquiry
    gen_inquiry_extras = [
        "Where is your clinic located exactly?",
        "Do you offer pediatric dentistry?",
        "What are the qualifications of your dentists?",
        "Do you have parking space available?",
        "How long has Teethtalk Dental Clinic been operating?",
        "Can I get my teeth cleaned and whitened on the same day?",
        "What should I bring for my first visit?",
        "Do you do invisible aligners?",
        "Are your instruments properly sterilized?",
        "Can I request my dental records?",
        "How to get to your clinic?",
        "Is there a nearby landmark to your clinic?",
        "Who is the head dentist?",
        "Do you have an x-ray machine in the clinic?"
    ]

    def generate_billing():
        if random.random() < 0.3:
            return random.choice(billing_extras)
        q = random.choice(billing_questions)
        p = random.choice(procedures_billing)
        return f"{q} {p}?"

    def generate_appointment():
        if random.random() < 0.3:
            return random.choice(appt_extras)
        v = random.choice(appt_verbs)
        n = random.choice(appt_nouns)
        t = random.choice(appt_times)
        return f"I want to {v} {n} {t}."

    def generate_post_op():
        if random.random() < 0.4:
            return random.choice(post_op_actions)
        i = random.choice(post_op_issues)
        a = random.choice(post_op_areas)
        return f"My {a} is {i} after the procedure, is this normal?"

    def generate_general():
        return random.choice(gen_inquiry_extras)

    intents = {
        "billing": generate_billing,
        "appointments": generate_appointment,
        "post_op_care": generate_post_op,
        "general_inquiry": generate_general
    }

    # Ensure the directory exists
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    print(f"Generating {num_samples} mock records with combinatorial variance...")
    
    dataset = []
    
    for _ in range(num_samples):
        intent = random.choice(list(intents.keys()))
        base_sentence = intents[intent]()
        
        # Apply prefix/suffix noise
        greeting = random.choice(greetings)
        opener = random.choice(polite_openers)
        
        # Construct the sentence
        parts = [p for p in [greeting, opener, base_sentence] if p]
        final_sentence = " ".join(parts)
        
        # Clean up double spaces or weird punctuation
        final_sentence = " ".join(final_sentence.split())
        final_sentence = final_sentence.replace("?.", "?").replace("..", ".").replace(" ,", ",")
        
        # Make a few lowercase randomly to simulate realistic typing
        if random.random() < 0.2:
            final_sentence = final_sentence.lower()
            
        dataset.append((final_sentence, intent))

    with open(output_file, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["text", "intent"])
        for sentence, intent in dataset:
            writer.writerow([sentence, intent])

    print(f"Successfully generated {output_file}")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    generate_mock_data()
