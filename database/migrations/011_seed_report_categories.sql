-- Seed a practical starter set of categories for report creation and search.
-- Existing reports remain unchanged; only active category options are added.
INSERT INTO categories (name, description) VALUES
    ('Assault', 'Physical attacks or attempted attacks against a person.'),
    ('Child safety', 'Reports involving the safety or exploitation of children.'),
    ('Corruption and abuse of power', 'Bribery, misuse of public authority, or abuse of entrusted power.'),
    ('Cybercrime', 'Online fraud, account compromise, digital threats, or other technology-enabled crime.'),
    ('Fraud and scams', 'Deception intended to steal money, property, or personal information.'),
    ('Harassment', 'Repeated unwanted targeting, intimidation, or abusive conduct.'),
    ('Hate speech and discrimination', 'Targeting or unequal treatment based on identity or protected characteristics.'),
    ('Missing persons', 'Information about a person whose whereabouts are unknown.'),
    ('Murder or attempted murder', 'Reports of a suspected killing or attempted killing.'),
    ('Other concerns', 'A report that does not fit another listed category.'),
    ('Rape and sexual violence', 'Reports of rape, sexual assault, or other sexual violence.'),
    ('Threats of violence', 'Threats to kill, injure, or physically harm a person.'),
    ('Violence', 'Other violent incidents or threats not covered by a more specific category.'),
    ('Public safety', 'Hazards or incidents that may put the wider community at risk.')
ON CONFLICT (name) DO NOTHING;
