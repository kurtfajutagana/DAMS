import csv
import random
import os

def generate_mock_data(output_file="data/mock_dataset.csv", num_samples=1000):
    intents = {
        "billing": [
            "How much do braces cost?",
            "Do you accept my health insurance?",
            "What are your fees for teeth whitening?",
            "Can I pay in installments?",
            "How much is a regular cleaning?",
            "Are X-rays included in the consultation fee?",
            "What payment methods do you accept?",
            "I need a copy of my last receipt.",
            "Is there a discount for senior citizens?",
            "Can I get a quote for a root canal?"
        ],
        "appointments": [
            "I want to schedule an appointment for tomorrow.",
            "How do I cancel my booking?",
            "Are you open on weekends?",
            "Can I reschedule my checkup to next week?",
            "Do you accept walk-in patients?",
            "What are your clinic hours?",
            "I need to see a dentist immediately, it's an emergency.",
            "Can I book a consultation with Dr. Smith?",
            "How long does a typical appointment last?",
            "Please remind me of my next appointment date."
        ],
        "post_op_care": [
            "My tooth is bleeding after the extraction, what should I do?",
            "How long until I can eat solid food?",
            "Can I drink coffee after getting a filling?",
            "My gums are swelling, is this normal?",
            "Should I take painkillers for the ache?",
            "When can I start brushing my teeth normally again?",
            "The temporary crown fell off, what now?",
            "How do I clean my new braces?",
            "Is it okay to use mouthwash right now?",
            "What should I do if the pain gets worse?"
        ],
        "general_inquiry": [
            "Where is your clinic located exactly?",
            "Do you offer pediatric dentistry?",
            "What are the qualifications of your dentists?",
            "Do you have parking space available?",
            "How long has Teethtalk Dental Clinic been operating?",
            "Can I get my teeth cleaned and whitened on the same day?",
            "What should I bring for my first visit?",
            "Do you do invisible aligners?",
            "Are your instruments properly sterilized?",
            "Can I request my dental records?"
        ]
    }

    # Ensure the directory exists
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    print(f"Generating {num_samples} mock records...")
    
    with open(output_file, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["text", "intent"])
        
        for _ in range(num_samples):
            # Pick a random intent
            intent = random.choice(list(intents.keys()))
            # Pick a random sentence for that intent
            # Add some minor random variation to make it more realistic
            base_sentence = random.choice(intents[intent])
            
            # Simple variations
            variations = [
                base_sentence,
                base_sentence.lower(),
                base_sentence.replace("?", "."),
                f"Hi, {base_sentence.lower()}",
                f"{base_sentence} Thanks."
            ]
            
            final_sentence = random.choice(variations)
            writer.writerow([final_sentence, intent])

    print(f"Successfully generated {output_file}")

if __name__ == "__main__":
    # Ensure working directory is the ml folder when this script is run
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    generate_mock_data()
