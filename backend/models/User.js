const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const NUST_DOMAINS = [
    'seecs.edu.pk', 'nbs.nust.edu.pk', 'smme.nust.edu.pk', 'scme.nust.edu.pk',
    's3h.nust.edu.pk', 'nust.edu.pk', 'pnec.edu.pk', 'mcs.edu.pk',
    'iese.edu.pk', 'asab.nust.edu.pk', 'igis.nust.edu.pk', 'rimms.nust.edu.pk',
    'sns.nust.edu.pk', 'nice.nust.edu.pk', 'camp.nust.edu.pk', 'cae.nust.edu.pk',
];

const DEPT_NAMES = {
    'seecs.edu.pk': 'SEECS', 'nbs.nust.edu.pk': 'NBS', 'smme.nust.edu.pk': 'SMME',
    'scme.nust.edu.pk': 'SCME', 's3h.nust.edu.pk': 'S3H', 'nust.edu.pk': 'NUST',
    'pnec.edu.pk': 'PNEC', 'mcs.edu.pk': 'MCS', 'iese.edu.pk': 'IESE',
    'asab.nust.edu.pk': 'ASAB', 'igis.nust.edu.pk': 'IGIS', 'rimms.nust.edu.pk': 'RIMMS',
    'sns.nust.edu.pk': 'SNS', 'nice.nust.edu.pk': 'NICE', 'camp.nust.edu.pk': 'CAMP',
    'cae.nust.edu.pk': 'CAE',
};

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: {
        type: String, required: true, unique: true,
        lowercase: true, trim: true,
        validate: {
            validator(v) {
                const domain = v.split('@')[1];
                return domain && NUST_DOMAINS.includes(domain);
            },
            message: 'Must be a valid NUST institutional email address'
        }
    },
    password: { type: String, required: true, minlength: 6 },
    department: { type: String },
}, { timestamps: true });

userSchema.pre('save', async function () {
    // Auto-set department from email
    const domain = this.email.split('@')[1];
    this.department = DEPT_NAMES[domain] || 'NUST';

    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
});

userSchema.methods.comparePassword = function (plain) {
    return bcrypt.compare(plain, this.password);
};

userSchema.methods.toPublic = function () {
    return { id: this._id, name: this.name, email: this.email, department: this.department };
};

module.exports = mongoose.model('User', userSchema);
